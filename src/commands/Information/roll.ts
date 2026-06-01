import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { DiceParser } from '../../dice/parser.js';
import type { RollResult } from '../../dice/types.js';
import { addRollToHistory } from './rollhistory.js';

function formatPlain(result: RollResult): string {
  const lines: string[] = [`🎲 **${result.expression}** = ${result.total}`];

  for (const roll of result.dieRolls || []) {
    lines.push(`  ${roll.count}d${roll.sides}: [${roll.rawRolls.join(', ')}]`);
    if (roll.droppedRolls.length > 0) lines.push(`  ↳ dropped [${roll.droppedRolls.join(', ')}]`);
    if (roll.keptRolls.length > 0) lines.push(`  ↳ kept [${roll.keptRolls.join(', ')}]`);
    if (roll.countMatches > 0) lines.push(`  ↳ c${roll.countMatches} match${roll.countMatches !== 1 ? 'es' : ''}`);
    if (roll.wins > 0) lines.push(`  ↳ ${roll.wins} win${roll.wins !== 1 ? 's' : ''}`);
  }

  if (result.tables?.length > 0) {
    for (const table of result.tables) {
      lines.push(`  📋 Table: ${table.breakdown} → ${table.selectedResult}`);
    }
  }

  if (result.truncated) {
    lines.push(`  ⚠️ Output truncated (too many dice)`);
  }

  return lines.join('\n');
}

function formatEmbed(result: RollResult): EmbedBuilder {
  const embed = new EmbedBuilder();

  // Color coding based on result
  if (result.error) {
    embed.setColor(0xed4245);
  } else if (result.total > 0) {
    embed.setColor(0x57f287);
  } else if (result.total < 0) {
    embed.setColor(0xed4245);
  } else {
    embed.setColor(0x9b59b6);
  }

  embed.setTitle('🎲 Dice Roll').addFields({ name: 'Expression', value: `\`${result.expression}\``, inline: false });

  // Dice breakdown with color indicators
  if (result.dieRolls?.length > 0) {
    const diceLines = result.dieRolls.map((roll: { count: number; sides: number; rawRolls: number[]; droppedRolls: number[]; keptRolls: number[]; countMatches: number; wins: number; total: number }) => {
      let line = `**${roll.count}d${roll.sides}**`;
      line += `: [${roll.rawRolls.join(', ')}]`;

      if (roll.droppedRolls.length > 0) {
        line += `\n  🗑️ dropped [${roll.droppedRolls.join(', ')}]`;
      }
      if (roll.keptRolls.length > 0) {
        line += `\n  ✅ kept [${roll.keptRolls.join(', ')}]`;
      }
      if (roll.countMatches > 0) {
        line += `\n  🔢 c${roll.countMatches} match${roll.countMatches !== 1 ? 'es' : ''}`;
      }
      if (roll.wins > 0) {
        line += `\n  ⭐ ${roll.wins} win${roll.wins !== 1 ? 's' : ''}`;
      }
      line += `\n  ➡️ **${roll.total}**`;
      return line;
    });

    embed.addFields({ name: 'Dice', value: diceLines.join('\n\n'), inline: false });
  }

  // Math operations
  if (result.math.length > 0) {
    const mathLines = result.math.map((m: { op: string; value: number }) => `${m.op} ${m.value}`);
    embed.addFields({ name: 'Math', value: mathLines.join('\n'), inline: false });
  }

  // Table rolls
  if (result.tables?.length > 0) {
    const tableLines = result.tables.map((t: { sides: number; selectedValue: number; entries: { value: number; result: string }[]; selectedResult: string }) => {
      const entries = t.entries.map((e: { value: number; result: string }) => `${e.value}: ${e.result}`).join(', ');
      return `**Table** (1d${t.sides} → ${t.selectedValue}):\n\`${entries}\`\nResult: ${t.selectedResult}`;
    });
    embed.addFields({ name: 'Tables', value: tableLines.join('\n\n'), inline: false });
  }

  // Inline rolls
  if (result.inlineRolls?.length > 0) {
    const inlineLines = result.inlineRolls.map((i: { expression: string; total: number }) => `\`${i.expression}\` = ${i.total}`);
    embed.addFields({ name: 'Inline Rolls', value: inlineLines.join('\n'), inline: false });
  }

  // Total
  embed.addFields({
    name: '💰 Total',
    value: `**${result.total}**`,
    inline: false,
  });

  if (result.truncated) {
    embed.addFields({
      name: '⚠️ Note',
      value: 'Output was truncated due to large number of dice.',
      inline: false,
    });
  }

  return embed;
}

export default {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice using Roll20-style syntax')
    .addStringOption(option =>
      option
        .setName('expression')
        .setDescription('Dice expression (e.g., "2d6+3", "10d6kh3", "d20adv")')
        .setRequired(true)
        .setMaxLength(200),
    )
    .addBooleanOption(option =>
      option
        .setName('plain')
        .setDescription('Use plain text instead of embed (faster, simpler)'),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const expression = interaction.options.getString('expression')!.trim();
    const plain = interaction.options.getBoolean('plain') ?? false;

    const parser = new DiceParser(expression);
    const result = parser.roll();

    if (result.error) {
      await interaction.reply({ content: `❌ ${result.error}` });
      return;
    }

    // Add to roll history
    addRollToHistory(interaction.user.id, expression, result.total);

    // Build embed or plain text
    if (plain) {
      await interaction.reply(formatPlain(result));
    } else {
      await interaction.reply({ embeds: [formatEmbed(result)] });
    }
  },
};

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { DiceParser } from '../../dice/parser.js';

export default {
  data: new SlashCommandBuilder()
    .setName('table')
    .setDescription('Roll on a custom table')
    .addStringOption(option =>
      option
        .setName('entries')
        .setDescription('Table entries in format "1:Result1|2:Result2|3:Result3"')
        .setRequired(true)
        .setMaxLength(500),
    )
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('Number of times to roll (default: 1)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const entriesStr = interaction.options.getString('entries')!.trim();
    const count = interaction.options.getInteger('count') ?? 1;

    // Parse entries
    const entries = entriesStr.split('|').map((entry, index) => {
      const parts = entry.split(':');
      if (parts.length < 2) {
        return { value: index + 1, result: entry.trim() };
      }
      const value = parseInt(parts[0]);
      const result = parts.slice(1).join(':').trim();
      return { value, result };
    });

    if (entries.length === 0) {
      await interaction.reply({ content: '❌ Table must have at least one entry.' });
      return;
    }

    // Build the table expression
    const tableExpr = `${count}t[${entries.map((e, i) => `${i + 1}:${e.result}`).join('|')}]`;

    const parser = new DiceParser(tableExpr);
    const results: EmbedBuilder[] = [];

    for (let i = 0; i < count; i++) {
      const parser = new DiceParser(tableExpr);
      const result = parser.roll();

      if (result.error) {
        await interaction.reply({ content: `❌ ${result.error}` });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`📋 Table Roll #${i + 1}`)
        .addFields({ name: 'Expression', value: `\`${tableExpr}\``, inline: false });

      if (result.tables.length > 0) {
        const table = result.tables[0];
        const entriesDisplay = table.entries.map(e => `${e.value}: ${e.result}`).join(', ');
        embed.addFields({ name: 'Table', value: `\`${entriesDisplay}\``, inline: false });
        embed.addFields({ name: 'Result', value: `**${table.selectedResult}**`, inline: false });
      }

      results.push(embed);
    }

    // Send up to 10 embeds (Discord limit)
    const embeds = results.slice(0, 10);
    await interaction.reply({ embeds });

    if (results.length > 10) {
      await interaction.followUp({ content: `⚠️ Showing 10 of ${results.length} rolls.` });
    }
  },
};

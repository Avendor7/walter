import { Events, Message } from 'discord.js';
import { DiceParser } from '../dice/parser.js';

// Regex to detect potential dice expressions in messages
const DICE_REGEX = /\[\[(.*?)\]\]|\d*d\d+(?:[a-z]+(?:\d+)?)*|d\d+(?:[a-z]+(?:\d+)?)*|\(\d*d\d+(?:[a-z]+(?:\d+)?)*\)\s*d\d+(?:[a-z]+(?:\d+)?)*|\d*t\[(?:\d+:[^\]]*)+\]/gi;

// Cooldown per channel: 2 seconds
const COOLDOWN_MS = 2000;
const channelCooldowns = new Map<string, number>();

export default {
  name: Events.MessageCreate,

  async execute(message: Message) {
    // Ignore bots
    if (message.author.bot) return;

    // Cooldown check
    const now = Date.now();
    const lastRoll = channelCooldowns.get(message.channelId);
    if (lastRoll && now - lastRoll < COOLDOWN_MS) return;

    const content = message.content;

    // Check for prefix-based rolls: !roll 2d6+3
    const prefixMatch = content.match(/^!\s*roll\s+(.+)/i);
    if (prefixMatch) {
      channelCooldowns.set(message.channelId, now);
      const expression = prefixMatch[1].trim();
      await handleRoll(message, expression);
      return;
    }

    // Auto-detect dice expressions in the message
    const matches = content.matchAll(DICE_REGEX);
    const found: string[] = [];

    for (const match of matches) {
      const expr = match[0];
      // Skip if it's part of a URL or code block
      if (expr.startsWith('http') || expr.startsWith('www')) continue;
      found.push(expr);
    }

    if (found.length === 0) return;

    channelCooldowns.set(message.channelId, now);

    // Process the first match (or combine them)
    // For simplicity, process the first dice expression found
    const expression = found[0];
    await handleRoll(message, expression);
  },
};

async function handleRoll(message: Message, expression: string) {
  const parser = new DiceParser(expression);
  const result = parser.roll();

  if (result.error) {
    await message.reply({ content: `❌ ${result.error}` });
    return;
  }

  // Build a compact embed for auto-detected rolls
  const { EmbedBuilder } = await import('discord.js');

  const embed = new EmbedBuilder()
    .setColor(result.total >= 0 ? 0x57f287 : 0xed4245)
    .setTitle(`🎲 ${expression}`)
    .addFields({
      name: 'Total',
      value: `**${result.total}**`,
      inline: true,
    });

  if (result.dieRolls.length > 0) {
    const diceInfo = result.dieRolls.map(r => `${r.count}d${r.sides}: [${r.rawRolls.join(', ')}]`).join('\n');
    embed.addFields({ name: 'Rolls', value: diceInfo, inline: false });
  }

  await message.reply({ embeds: [embed] });
}

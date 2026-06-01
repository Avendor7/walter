import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('percent')
    .setDescription('Roll a percentile (1-100)')
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('Number of rolls (default: 1)')
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const count = interaction.options.getInteger('count') ?? 1;
    const rolls: number[] = [];

    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * 100) + 1);
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🎲 Percentile Roll')
      .addFields({ name: 'Expression', value: `d100${count > 1 ? ` × ${count}` : ''}`, inline: false });

    if (count === 1) {
      const roll = rolls[0];
      embed.addFields({ name: 'Result', value: `**${roll}**`, inline: false });

      // Add flavor text based on the roll
      if (roll <= 5) {
        embed.addFields({ name: '🔥 Critical Success', value: 'Amazing! The stars align in your favor!' });
      } else if (roll <= 20) {
        embed.addFields({ name: '✅ Success', value: 'You succeed!' });
      } else if (roll <= 50) {
        embed.addFields({ name: '🤔 Partial Success', value: 'It works, but not perfectly.' });
      } else if (roll <= 80) {
        embed.addFields({ name: '⚠️ Failure', value: 'You fail, but not catastrophically.' });
      } else {
        embed.addFields({ name: '💀 Critical Failure', value: 'Everything goes wrong!' });
      }
    } else {
      const rollStr = rolls.map(r => `**${r}**`).join(', ');
      embed.addFields({ name: 'Results', value: rollStr, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

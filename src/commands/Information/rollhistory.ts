import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';

interface RollEntry {
  expression: string;
  total: number;
  timestamp: number;
  user: string;
}

// Store rolls per user (in memory)
const rollHistory = new Map<string, RollEntry[]>();
const MAX_HISTORY = 20;

export default {
  data: new SlashCommandBuilder()
    .setName('rollhistory')
    .setDescription('View your recent dice rolls')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('View another user\'s history')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const history = rollHistory.get(user.id) ?? [];

    if (history.length === 0) {
      await interaction.reply({ content: `📜 ${user.username} hasn't rolled any dice yet!` });
      return;
    }

    const recent = history.slice(-10).reverse();

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`📜 ${user.username}'s Roll History`)
      .setThumbnail(user.displayAvatarURL())
      .addFields({
        name: 'Recent Rolls',
        value: recent.map((r, i) => {
          const time = new Date(r.timestamp).toLocaleTimeString();
          return `${i + 1}. \`${r.expression}\` = ${r.total} (${time})`;
        }).join('\n'),
        inline: false,
      });

    await interaction.reply({ embeds: [embed] });
  },
};

// Export function to add rolls to history
export function addRollToHistory(userId: string, expression: string, total: number) {
  if (!rollHistory.has(userId)) {
    rollHistory.set(userId, []);
  }

  const history = rollHistory.get(userId)!;
  history.push({ expression, total, timestamp: Date.now(), user: userId });

  // Trim to max size
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

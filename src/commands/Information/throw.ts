import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import thrownItems from '../../static/commands.js';

export default {
	data: new SlashCommandBuilder()
		.setName('newthrow')
		.setDescription('throw virtual things at your enemies')
		.addUserOption((option) => option.setName('user').setDescription('The user you want to throw at').setRequired(true)),

	async execute(interaction: ChatInputCommandInteraction) {
		const target = interaction.options.getUser('user');
		const item = thrownItems[Math.floor(Math.random() * thrownItems.length)];
		await interaction.reply(`${interaction.user} Threw ${item} ${target}`);
	},
};

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('hug')
		.setDescription('Hug Someone')
		.addUserOption((option) => option.setName('user').setDescription('The user you want to hug').setRequired(true)),

	async execute(interaction: ChatInputCommandInteraction) {
		const target = interaction.options.getUser('user');
		await interaction.reply(`${interaction.user} hugs ${target}`);
	},
};

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import axios from 'axios';

export default {
	data: new SlashCommandBuilder()
		.setName('xkcd')
		.setDescription('Get an XKCD comic')
		.addIntegerOption(option =>
			option.setName('number')
				.setDescription('Comic number (omit for latest)')
				.setRequired(false)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const number = interaction.options.getInteger('number');

		try {
			const { data } = await axios.get(`https://xkcd.com/${number ?? 'info'}.0.json`);

			await interaction.reply(data.img);
		} catch (error) {
			console.error(error);
			await interaction.reply('Failed to fetch XKCD comic.');
		}
	},
};

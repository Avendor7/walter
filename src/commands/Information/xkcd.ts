import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
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

			const embed = new EmbedBuilder()
				.setTitle(data.title)
				.setImage(data.img)
				.setFooter({ text: data.alt })
				.setURL(`https://xkcd.com/${data.num}`);

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply('Failed to fetch XKCD comic.');
		}
	},
};

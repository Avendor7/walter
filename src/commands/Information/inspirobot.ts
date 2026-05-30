import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import axios from 'axios';

export default {
	data: new SlashCommandBuilder()
		.setName('inspirobot')
		.setDescription('Generate Inspirobot image'),

	async execute(interaction: ChatInputCommandInteraction) {
		let reply: string;

		try {
			const { data } = await axios.get('https://inspirobot.me/api?generate=true');
			reply = data;
		} catch (error) {
			console.error(error);
			await interaction.reply('Failed to generate Inspirobot image.');
			return;
		}

		await interaction.reply(reply);
	},
};

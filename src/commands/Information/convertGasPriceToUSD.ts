import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import axios from 'axios';

export default {
	data: new SlashCommandBuilder()
		.setName('convertlitrestogallons')
		.setDescription('Converts Canadian Dollars per Litre to USD per Gallon')
		.addNumberOption((option) => option.setName('cadperlitre').setDescription('Price').setRequired(true)),

	async execute(interaction: ChatInputCommandInteraction) {
		const cadPerLitre = interaction.options.getNumber('cadperlitre')!;

		try {
			const response = await axios.get('https://open.er-api.com/v6/latest/CAD');
			const GALLONS_PER_LITRE = 0.264172;
			const usdPerGallon = (cadPerLitre * response.data.rates.USD) / GALLONS_PER_LITRE;
			await interaction.reply(`$${cadPerLitre} CAD/litre is $${usdPerGallon.toFixed(2)} USD/gallon`);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Failed to fetch exchange rates. Please try again later.', ephemeral: true });
		}
	},
};

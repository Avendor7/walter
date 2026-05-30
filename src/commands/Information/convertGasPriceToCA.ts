import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import axios from 'axios';

export default {
	data: new SlashCommandBuilder()
		.setName('convertgallonstolitres')
		.setDescription('Converts USD per Gallon to Canadian Dollars per Litre')
		.addNumberOption((option) => option.setName('usdpergallon').setDescription('Price').setRequired(true)),

	async execute(interaction: ChatInputCommandInteraction) {
		const USDperGallon = interaction.options.getNumber('usdpergallon')!;

		try {
			const response = await axios.get('https://open.er-api.com/v6/latest/USD');
			const LITERS_PER_GALLON = 3.78541;
			const cadPerLitre = (USDperGallon * response.data.rates.CAD) / LITERS_PER_GALLON;
			await interaction.reply(`$${USDperGallon} USD/gallon is $${cadPerLitre.toFixed(2)} CAD/litre`);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Failed to fetch exchange rates. Please try again later.', ephemeral: true });
		}
	},
};

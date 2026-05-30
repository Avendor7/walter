import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { DateTime } from 'luxon';

function toUTC(datetime: string, timezone: string): Date {
	const local = DateTime.fromSQL(datetime).setZone(timezone);
	return local.setZone('UTC').toJSDate();
}

function embeddedReply(response: any, interaction: ChatInputCommandInteraction) {
	if (!interaction.options.getBoolean('displaylocation')) {
		response.location.name = 'Redacted';
		response.location.region = 'Redacted';
	}

	return new EmbedBuilder()
		.setTitle(response.location.name + ', ' + response.location.region)
		.setURL('https://www.weatherapi.com/')
		.setThumbnail('https:' + response.forecast.forecastday[0].day.condition.icon)
		.addFields({ name: 'Condition ', value: response.forecast.forecastday[0].day.condition.text })
		.addFields({
			name: 'High Tomorrow',
			value: response.forecast.forecastday[0].day.maxtemp_c + '°C • ' + response.forecast.forecastday[0].day.maxtemp_f + '°F',
		})
		.addFields({
			name: 'Low Tomorrow',
			value: response.forecast.forecastday[0].day.mintemp_c + '°C • ' + response.forecast.forecastday[0].day.mintemp_f + '°F',
		})
		.setTimestamp(toUTC(response.current.last_updated, response.location.tz_id))
		.setFooter({ text: 'Last Updated' });
}

export default {
	data: new SlashCommandBuilder()
		.setName('forecastshare')
		.setDescription('Gets tomorrows weather')
		.addStringOption((option) => option.setName('location').setDescription('City/Town').setRequired(true))
		.addBooleanOption((option) =>
			option.setName('displaylocation').setDescription('True/False share your city/state in reply').setRequired(false),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const location = interaction.options.getString('location');
		const urlString = 'https://api.weatherapi.com/v1/forecast.json?key=' + process.env.weatherapitoken + '&q=' + location + '&days=1';

		try {
			const { data } = await axios.get(urlString);
			const reply = embeddedReply(data, interaction);
			await interaction.reply({ embeds: [reply] });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Failed to fetch forecast data. Check the location and try again.', ephemeral: true });
		}
	},
};

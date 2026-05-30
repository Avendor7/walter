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
		.setThumbnail('https:' + response.current.condition.icon)
		.addFields({ name: 'Condition ', value: response.current.condition.text })
		.addFields({
			name: 'Temperature (feels like)',
			value: response.current.temp_c + '°C (' + response.current.feelslike_c + '°C) • ' + response.current.temp_f + '°F (' + response.current.feelslike_f + '°F) ',
		})
		.addFields({ name: 'Wind', value: response.current.wind_kph + ' KPH • ' + response.current.wind_mph + ' MPH' })
		.addFields({ name: 'UV Index', value: response.current.uv.toString() })
		.setTimestamp(toUTC(response.current.last_updated, response.location.tz_id))
		.setFooter({ text: 'Last Updated' });
}

export default {
	data: new SlashCommandBuilder()
		.setName('weathershare')
		.setDescription('Gets the weather')
		.addStringOption((option) => option.setName('location').setDescription('City/Town').setRequired(true))
		.addBooleanOption((option) =>
			option.setName('displaylocation').setDescription('True/False share your city/state in reply').setRequired(false),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const location = interaction.options.getString('location');
		const urlString = 'https://api.weatherapi.com/v1/current.json?key=' + process.env.weatherapitoken + '&q=' + location + '&aqi=yes' + '&days=1';

		try {
			const { data } = await axios.get(urlString);
			const reply = embeddedReply(data, interaction);
			await interaction.reply({ embeds: [reply] });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Failed to fetch weather data. Check the location and try again.', ephemeral: true });
		}
	},
};

const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const axios = require('axios');

const { DateTime } = require("luxon");

function toUTC(datetime, timezone){
    let local = DateTime.fromSQL(datetime).setZone(timezone);
    return local.setZone("UTC").toJSDate();
}
//creates a formatted Discord Embeded object to reply to a weather request
function embeddedReply(response){
    return new EmbedBuilder()
        .setTitle(response.location.name + ", " + response.location.region)
        .setURL('https://www.weatherapi.com/')
        .setThumbnail('https:' + response.forecast.forecastday[0].day.condition.icon)
        .addFields(
            { name: 'Condition ', value: response.forecast.forecastday[0].day.condition.text},
        )
        .addFields(
            { name: 'High Tomorrow', value: response.forecast.forecastday[0].day.maxtemp_c + "°C • " + response.forecast.forecastday[0].day.maxtemp_f + "°F" },
        )
        .addFields(
            { name: 'Low Tomorrow', value: response.forecast.forecastday[0].day.mintemp_c + "°C • " + response.forecast.forecastday[0].day.mintemp_f + "°F" },
        )
        .setTimestamp(toUTC(response.current.last_updated, response.location.tz_id))
	    .setFooter({ text: 'Last Updated',});
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forecastshare')
	    .setDescription('Gets tomorrows weather')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('City/Town')
                .setRequired(true)),
    async execute(interaction) {

        const location = interaction.options.getString('location');
        let reply ="";
        let urlString = "https://api.weatherapi.com/v1/forecast.json?key=" + process.env.weatherapitoken + "&q=" + location + "&days=1";
        
        await axios
            .get(urlString)
            .then(res => {
                //generate the embedded reply using the returned data
                reply = embeddedReply(res.data);
            })
            .catch(error => {
                console.error(error);
            });

        await interaction.reply({embeds: [reply]});
    },
};
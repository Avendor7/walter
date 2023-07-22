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
        .setThumbnail('https:' + response.current.condition.icon)
        .addFields(
            { name: 'Condition ', value: response.current.condition.text},
        )
        .addFields(
            { name: 'Temperature (feels like)', value: response.current.temp_c + "°C (" + response.current.feelslike_c + "°C) • " + response.current.temp_f + "°F (" + response.current.feelslike_f + "°F) " },
        )
        .addFields(
            { name: 'Wind', value: response.current.wind_kph + " KPH • " + response.current.wind_mph + " MPH"},
        )
        .addFields(
            { name: 'UV Index', value: response.current.uv.toString()},
        )
        .addFields(
            { name: 'Air Quality (PM2.5)', value: response.current.air_quality.pm2_5.toFixed(2)},
        )
        .setTimestamp(toUTC(response.current.last_updated, response.location.tz_id))
	    .setFooter({ text: 'Last Updated',});
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weathershare')
	    .setDescription('Gets the weather')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('City/Town')
                .setRequired(true)),
    async execute(interaction) {

        const location = interaction.options.getString('location');
        let reply ="";
        let urlString = "https://api.weatherapi.com/v1/current.json?key=" + process.env.weatherapitoken + "&q=" + location + "&aqi=yes" + "&days=1";
        
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
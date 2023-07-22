const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const axios = require('axios');

const { DateTime } = require("luxon");

function toUTC(datetime, timezone){
    let local = DateTime.fromSQL(datetime).setZone(timezone);
    return local.setZone("UTC").toJSDate();
}
//creates a formatted Discord Embeded object to reply to a weather request
function embeddedReply(response, interaction){
    console.log(interaction.options.getBoolean('displaylocation'));
    if(!interaction.options.getBoolean('displaylocation')){
        response.location.name = "Redacted";
        response.location.region = "Redacted";
    }
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
            { name: 'Wind ', value: response.current.wind_kph + " KPH • " + response.current.wind_mph + " MPH"},
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
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('displaylocation')
                .setDescription('True/False share your city/state in reply')
                .setRequired(false)),
    async execute(interaction) {

        const location = interaction.options.getString('location');
        let reply ="";
        let urlString = "https://api.weatherapi.com/v1/current.json?key=" + process.env.weatherapitoken + "&q=" + location;
        
        await axios
            .get(urlString)
            .then(res => {
                //generate the embedded reply using the returned data
                reply = embeddedReply(res.data, interaction);
            })
            .catch(error => {
                console.error(error);
            });

        await interaction.reply({embeds: [reply]});
    },
};
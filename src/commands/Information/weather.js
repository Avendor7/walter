const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');

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
        let urlString = "https://api.weatherapi.com/v1/current.json?key=" + process.env.weatherapitoken + "&q=" + location;
        
        await axios
            .get(urlString)
            .then(res => {
                reply = res.data.location.name + " " + res.data.location.region + " " + res.data.current.temp_c +"°C " + res.data.current.temp_f+"°F";
            })
            .catch(error => {
                console.error(error);
            });

        await interaction.reply(reply);
    },
};
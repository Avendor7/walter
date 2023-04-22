const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');

function formatReply(response){
    
    return response.location.name + " " + response.location.region + " " + response.current.temp_c +"°C " + response.current.temp_f+"°F";
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
        let urlString = "https://api.weatherapi.com/v1/current.json?key=" + process.env.weatherapitoken + "&q=" + location;
        
        await axios
            .get(urlString)
            .then(res => {
                reply = formatReply(res.data);
                console.log(reply);
            })
            .catch(error => {
                console.error(error);
            });

        await interaction.reply(reply);
    },
};
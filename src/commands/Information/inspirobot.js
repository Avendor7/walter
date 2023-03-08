const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inspirobot')
        .setDescription('Generate Inspirobot image'),
    async execute(interaction) {

        const location = interaction.options.getString('location');
        let reply = "";
        let urlString = "https://inspirobot.me/api?generate=true";

        await axios
            .get(urlString)
            .then(res => {
                //Discord magically handles the jpeg URL the API sends back. 
                //Somehow it downloads it and embeds it for me. yay
                reply = res.data;
            })
            .catch(error => {
                console.error(error);
            });

        await interaction.reply(reply);
    },
};
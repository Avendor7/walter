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
                //reply = res.data.location.name + " " + res.data.location.region + " " + res.data.current.temp_c +"°C " + res.data.current.temp_f+"°F";
                //get the image
                //download it
                //send it (take a look at the weather code in the dev branch for this)
            })
            .catch(error => {
                console.error(error);
            });

        await interaction.reply(reply);
    },
};
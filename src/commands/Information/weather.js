const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');
const sharp = require('sharp');


async function addTextOnImage(weather) {
    try {
        const width = 627;
        const height = 418;
        const text = weather.name;

        const svgImage = `
      <svg width="${width}" height="${height}">
      <style>
      .title { fill: #999; font-size: 70px; font-weight: bold;}
      </style>
      <text x="50%" y="50%" text-anchor="middle" class="title">${text}</text>
      </svg>
      `;
        const svgBuffer = Buffer.from(svgImage);

        const image = await sharp("./src/images/sunny.png")
            .composite([
                {
                    input: svgBuffer,
                    top: 0,
                    left: 0,
                },
            ])
            .toFile("./src/images/image_export.png");
    } catch (error) {
        console.log(error);
    }
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
        let reply = "";
        let urlString = "https://api.weatherapi.com/v1/current.json?key=" + process.env.weatherapitoken + "&q=" + location;

        await axios
            .get(urlString)
            .then(res => {
                addTextOnImage(res.data);
                reply = res.data.location.name + " " + res.data.location.region + " " + res.data.current.temp_c + "°C " + res.data.current.temp_f + "°F";

            })
            .catch(error => {
                console.error(error);
            });

        await interaction.reply(reply);
    },


};
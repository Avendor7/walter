const { SlashCommandBuilder } = require('@discordjs/builders');
data = require('../../static/commands.js');
const axios = require('axios');

async function getExchangeRate(){
    await axios
        .get('https://open.er-api.com/v6/latest/USD')
        .then(res => {
            return res.data.rates.CAD;
        });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convertgaspricetoca')
        .setDescription('Converts USD per Gallon to Canadian Dollars per Litre')
        .addNumberOption(option =>
            option
                .setName('usdpergallon')
                .setDescription('Price')
                .setRequired(true)
        ),
    async execute(interaction) {

        let USDperGallon = interaction.options.getNumber('USDperGallon');
        let CADperLitre = USDperGallon * getExchangeRate();
        console.log(getExchangeRate());
        return interaction.reply(`${interaction.options.getNumber('usdpergallon')}`);
    },
    
};
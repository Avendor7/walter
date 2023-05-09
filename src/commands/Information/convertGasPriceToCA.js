const { SlashCommandBuilder } = require('@discordjs/builders');
data = require('../../static/commands.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convertgallonstolitres')
        .setDescription('Converts USD per Gallon to Canadian Dollars per Litre')
        .addNumberOption(option =>
            option
                .setName('usdpergallon')
                .setDescription('Price')
                .setRequired(true)
        ),
    async execute(interaction) {

        const USDperGallon = interaction.options.getNumber('usdpergallon'); 
        const response = await axios.get('https://open.er-api.com/v6/latest/USD');
        const LITERS_PER_GALLON = 3.78541; // number of liters in a gallon
        const cadPerLitre = (USDperGallon * response.data.rates.CAD) / (LITERS_PER_GALLON);
        return interaction.reply(`$${USDperGallon} USD/gallon is $${cadPerLitre.toFixed(2)} CAD/litre`);
    },
    
};
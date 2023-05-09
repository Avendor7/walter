const { SlashCommandBuilder } = require('@discordjs/builders');
data = require('../../static/commands.js');
const axios = require('axios');

async function getExchangeRate(){
    
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convertlitrestogallons')
        .setDescription('Converts Canadian Dollars per Litre to USD per Gallon')
        .addNumberOption(option =>
            option
                .setName('cadperlitre')
                .setDescription('Price')
                .setRequired(true)
        ),
    async execute(interaction) {

        const cadPerLitre = interaction.options.getNumber('cadperlitre'); 
        const response = await axios.get('https://open.er-api.com/v6/latest/CAD');
        const GALLONS_PER_LITRE = 0.264172; // number of liters in a gallon
        const usdPerGallon = (cadPerLitre * response.data.rates.USD) / (GALLONS_PER_LITRE);
        return interaction.reply(`$${cadPerLitre} USD/gallon is $${usdPerGallon.toFixed(2)} CAD/litre`);

    },
    
};
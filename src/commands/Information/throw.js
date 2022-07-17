const { SlashCommandBuilder } = require('@discordjs/builders');
data = require('../../static/commands.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('newthrow')
        .setDescription('throw virtual things at your enemies')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user you want to throw at')
                .setRequired(true)
        ),
    async execute(interaction) {
        return interaction.reply(`${interaction.user} Threw ${data.thrownItems[Math.floor(Math.random()*data.thrownItems.length)]} ${interaction.options.getUser('user')}`)
    },
};
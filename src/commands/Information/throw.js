const { SlashCommandBuilder } = require('@discordjs/builders');

thrownItems = [
    "cheese",
    "tomatoes"
];

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
        return interaction.reply(`${interaction.user} Threw ${thrownItems[Math.floor(Math.random()*thrownItems.length)]} ${interaction.options.getUser('user')}`)
    },
};
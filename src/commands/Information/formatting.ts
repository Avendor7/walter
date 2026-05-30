import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

function embeddedReply() {
	return new EmbedBuilder()
		.setTitle('Discord Markdown Cheat Sheet')
		.setURL('https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline-')
		.addFields({ name: '*Italics*', value: '`*Italics*`' })
		.addFields({ name: '**Bold**', value: '`**Bold**`' })
		.addFields({ name: '***Bold Italics***', value: '`***Bold Italics***`' })
		.addFields({ name: '__Underline__', value: '`__Underline__`' })
		.addFields({ name: '~~Strikethrough~~', value: '`~~Strikethrough~~`' });
}

export default {
	data: new SlashCommandBuilder()
		.setName('formatting')
		.setDescription('Discord Markdown Cheat Sheet'),

	async execute(interaction: ChatInputCommandInteraction) {
		const reply = embeddedReply();
		await interaction.reply({ embeds: [reply] });
	},
};

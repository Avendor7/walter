import { Client, GatewayIntentBits, Collection } from 'discord.js';
import * as fs from 'fs';
import 'dotenv/config';

const client = new Client({ intents: [GatewayIntentBits.Guilds] }) as any;
client.commands = new Collection();

const functions = fs.readdirSync('./src/functions').filter((file) => file.endsWith('.ts'));
const commandFolders = fs.readdirSync('./src/commands');
const eventFiles = fs.readdirSync('./src/events').filter((file) => file.endsWith('.ts'));

(async () => {
	for (const file of functions) {
		(await import(`./functions/${file}`)).default(client);
	}

	client.handleEvents(eventFiles, './src/events');
	client.handleCommands(commandFolders, './src/commands');

	client.on('ready', () => {
		client.guilds.cache.forEach((guild) => {
			console.log(`${guild.name} | ${guild.memberCount} | ${guild.id}`);
		});
	});

	client.login(process.env.token!);
})();

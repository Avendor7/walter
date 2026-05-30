import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { Collection } from 'discord.js';
import * as fs from 'fs';
const getRepoInfo = require('git-repo-info');

const info = getRepoInfo();

const clientId = process.env.clientid;
const guildId = '294925791136055297';

export default (client: any) => {
	client.handleCommands = async (commandFolders: string[], path: string) => {
		client.commandArray = [];

		for (const folder of commandFolders) {
			const commandFiles = fs.readdirSync(`${path}/${folder}`).filter((file) => file.endsWith('.ts'));
			for (const file of commandFiles) {
				const command = await import(`../commands/${folder}/${file}`);
				client.commands.set(command.default.data.name, command.default);
				client.commandArray.push(command.default.data.toJSON());
			}
		}

		const rest = new REST({ version: '9' }).setToken(process.env.token!);

		try {
			console.log('Started refreshing application (/) commands.');
			console.log('Git Tag: ' + info.tag);
			console.log('Git Commit hash: ' + info.abbreviatedSha);

			if (process.env.env === 'local') {
				console.log('Running in dev mode');
				await rest.put(Routes.applicationGuildCommands(clientId!, guildId), { body: client.commandArray });
			} else {
				console.log('Running in production mode');
				await rest.put(Routes.applicationCommands(clientId!), { body: client.commandArray });
			}

			console.log('Successfully reloaded application (/) commands.');
		} catch (error) {
			console.error(error);
		}
	};
};

import { Events, Client } from 'discord.js';

export const name = Events.Ready;
export const once = true;

export async function execute(client: Client) {
	console.log(`Ready! Logged in as ${client.user.tag}`);
}

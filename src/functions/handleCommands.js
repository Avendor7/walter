const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');

const getRepoInfo = require('git-repo-info');

const info = getRepoInfo();

// Place your client and guild ids here
//weathershare#9331
const clientId = process.env.clientid;
//avendoria
const guildId = '294925791136055297';

module.exports = (client) => {

    client.handleCommands = async (commandFolders, path) => {
        client.commandArray = [];

        for (folder of commandFolders) {
            const commandFiles = fs.readdirSync(`${path}/${folder}`).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const command = require(`../commands/${folder}/${file}`);
                // Set a new item in the Collection
                // With the key as the command name and the value as the exported module
                client.commands.set(command.data.name, command);
                client.commandArray.push(command.data.toJSON());
            }
        }
        const rest = new REST({ version: '9' }).setToken(process.env.token);

        (async () => {
            try {
                console.log('Started refreshing application (/) commands.');
                console.log('Git Tag: ' + info.tag);
                console.log('Git Commit hash: ' + info.abbreviatedSha)
                //run dev commands in a guild.
                if (process.env.env == "local"){
                    console.log("Running in dev mode");
                    await rest.put(
                        Routes.applicationGuildCommands(clientId, guildId),
                        { body: client.commandArray },
                    );
                }else{
                    console.log("Running in production mode");
                    await rest.put(
                        Routes.applicationCommands(clientId),
                        { body: client.commandArray },
                    );
                }
                console.log('Successfully reloaded application (/) commands.');
            } catch (error) {
                console.error(error);
            }
        })();


    }
}
const {Client, GatewayIntentBits, Collection} = require('discord.js');
const fs = require('fs');
const client = new Client({intents: GatewayIntentBits.Guilds});
require('dotenv').config();

client.commands = new Collection();

const functions =  fs.readdirSync("./src/functions").filter(file => file.endsWith("js"));
const commandFolders =  fs.readdirSync("./src/commands");
const eventFiles =  fs.readdirSync("./src/events").filter(file => file.endsWith("js"));

(async () => {
    for(file of functions){
        require(`./functions/${file}`)(client);
    }
    client.handleEvents(eventFiles, "./src/events");
    client.handleCommands(commandFolders, "./src/commands");
    client.on("ready", () => {
        client.guilds.cache.forEach( (guild) => {
            console.log(`${guild.name} | ${guild.memberCount} | ${guild.id}`)
            })
    });
    
    client.login(process.env.token);
})();
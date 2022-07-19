const { SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const commands = [
    // '/help' command
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with using the bot'),
    // '/quote <method> <value>' command
    new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Quote a message with a URL or text')
        .addStringOption((option: typeof SlashCommandBuilder) =>
            option.setName('method')
                .setDescription('How you want to quote the message (text only works in the same channel)')
                .setRequired(true)
                .addChoices(
                    { name: 'url', value: 'url' },
                    { name: 'text', value: 'text' },))
        .addStringOption((option: typeof SlashCommandBuilder) =>
            option.setName('value')
                .setDescription('The URL or (partial) text of the message you want to quote')
                .setRequired(true)
        )
]
    .map(command => command.toJSON())

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');


        if (process.env.GUILD_ID) {
            // For server-specific command deployment (good for testing)
            console.log('Deploying commands to server:', process.env.GUILD_ID);
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
        } else {
            // For global command deployment (use in production)
            console.log('Deploying commands to all servers');
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
        }

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

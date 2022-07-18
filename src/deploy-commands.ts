const { SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Main Bot
// const clientId = '975140381786271866';
// Beta Bot
const clientId = '986285272582983701';
// Test Server ID
const guildId = '788505451720474684';


const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with using the bot'),
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

        await rest.put(
            // Routes.applicationGuildCommands(clientId, guildId),
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

import path from 'path';
import dotenv from 'dotenv';
import Discord, { GatewayIntentBits } from 'discord.js';

import {
  isBot,
  match,
  helpEmbed,
  urlQuote,
  textQuote,
} from './utils';
import { URL, MARKDOWN } from './regexps';

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildWebhooks
  ]
});

// Bot login
client.once('ready', () => {
  if (client.user == null) {
    return;
  }

  console.log(`Logged in as ${client.user.tag}`);

  // Set 'Listening to /help' status
  client.user.setActivity({
    type: Discord.ActivityType.Listening,
    name: '/help',
  });
})

// Look for new messages
client.on('messageCreate', async (message) => {
  // Make sure the message is not from a bot and that other conditions are met
  if (isBot(message) || client.user == null) {
    return;
  }

  /**
   * Help
   * @example
   * $help
  */
  if (message.content.startsWith('$help')) {
    try {
      if (!(message.channel instanceof Discord.StageChannel)) {
        await message.channel.send({ embeds: [helpEmbed()] });
      } else throw new Error('Cannot send message in stage channel');
    } catch (error) {
      console.log("Error sending help command:", error);
    }
  }

  /**
   * Markdown style quotation
   * @example
   * > message
   */
  else if (message.content.match(MARKDOWN)) {
    const fragments = message.content.match(new RegExp(MARKDOWN, 'gm')) ?? [];
    const text = fragments
      .map((fragment) => fragment.match(MARKDOWN)?.groups?.text)
      .filter((match) => match != null)
      .join('\n');

    textQuote(client, text, message);
  }

  /**
   * URL quotation
   * @example
   * https://discordapp.com/channels/123/456/789
   */
  else if (message.content.match(URL)) {
    urlQuote(client, message.content, message);
  }
});

// Slash command responses
client.on('interactionCreate', async interaction => {
  if (interaction.type !== Discord.InteractionType.ApplicationCommand) return;

  const { commandName } = interaction;

  // Help command response
  if (commandName === 'help') {
    await interaction.reply({
      embeds: [helpEmbed()], ephemeral: true
    })
  }

  // Quote command response
  if (commandName === 'quote') {
    const method = interaction.options.get('method')?.value;
    const value = interaction.options.get('value')?.value;

    if (typeof value !== 'string') {
      await interaction.reply({
        content: 'Error! Please try again', ephemeral: true
      })
      return;
    }

    // If 'url' method, it follows the URL quotation method from above
    if (method === 'url') {
      urlQuote(client, value, undefined, interaction);
    }
    // If 'text' method, it follows the text quotation method from above
    else {
      textQuote(client, value, undefined, interaction);
    }
  }
});

(async () => {
  await client.login(process.env.DISCORD_TOKEN);
})();

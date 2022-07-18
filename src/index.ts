import path from 'path';
import dotenv from 'dotenv';
import Discord, { GatewayIntentBits } from 'discord.js';

import {
  mimic,
  toEmbed,
  isBot,
  match,
  fetchMessageByText,
  removeEmptyLines,
  helpEmbed,
  replaceRoleMentions,
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
  if (isBot(message) || client.user == null || message.guild == null) {
    return;
  }

  /**
   * Help
   * @example
   * /help
  */
  if (message.content.startsWith('$help')) {
    try {
      await message.channel.send({ embeds: [helpEmbed()] });
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

    if (message.channel.type !== Discord.ChannelType.GuildText
      && message.channel.type !== Discord.ChannelType.GuildPublicThread
      && message.channel.type !== Discord.ChannelType.GuildNews) {
      return;
    }

    const quote = await fetchMessageByText(text, message.channel, [message.id]);

    if (quote == null) {
      return;
    }

    var content = removeEmptyLines(
      message.content.replace(new RegExp(MARKDOWN, 'gm'), ''),
    );

    if (!(message.member?.permissions.has(Discord.PermissionFlagsBits.MentionEveryone)
      || message.member?.permissions.has(Discord.PermissionFlagsBits.Administrator))) {
      content = replaceRoleMentions(message, content);
    }

    try {
      await mimic(content, message, client.user.id, {
        embeds: [await toEmbed(quote, client.user.username, client.user.displayAvatarURL())],
      });
    } catch (error) {
      console.log("Error sending quote:", error);
    }
  }

  /**
   * URL quotation
   * @example
   * https://discordapp.com/channels/123/456/789
   */
  else if (message.content.match(URL)) {
    const urls = message.content.match(new RegExp(URL, 'gm')) ?? [];
    const matches = urls.map((url) => url.match(URL));
    const embeds: Discord.EmbedBuilder[] = [];

    for (const match of matches) {
      if (
        !match?.groups?.channelId ||
        !match?.groups?.messageId ||
        !match?.groups?.guildId
      ) {
        continue;
      }

      const { guildId, channelId, messageId } = match.groups;

      if (guildId !== message.guild.id) {
        continue;
      }

      const channel = await client.channels.fetch(channelId);

      if (!(channel instanceof Discord.TextChannel
        || channel instanceof Discord.ThreadChannel
        || channel instanceof Discord.NewsChannel)) {
        continue;
      }
      try {
        const quote = await channel.messages.fetch(messageId);
        embeds.push(await toEmbed(quote, client.user.username, client.user.displayAvatarURL()));
      } catch (e) {
        console.log("Error fetching message:", e);
      }
    }

    if (embeds.length === 0) {
      return;
    }

    var content = removeEmptyLines(
      message.content.replace(new RegExp(URL, 'gm'), ''),
    );

    if (!(message.member?.permissions.has(Discord.PermissionFlagsBits.MentionEveryone)
      || message.member?.permissions.has(Discord.PermissionFlagsBits.Administrator))) {
      content = replaceRoleMentions(message, content);
    }

    try {
      await mimic(content, message, client.user.id, {
        embeds,
      });
    } catch (error) {
      console.log("Error sending quote:", error);
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.type !== Discord.InteractionType.ApplicationCommand) return;

  const { commandName } = interaction;

  if (commandName === 'help') {
    await interaction.reply({
      embeds: [helpEmbed()], ephemeral: true
    })
  }

  if (commandName === 'quote') {
    const method = interaction.options.get('method')?.value;
    const value = interaction.options.get('value')?.value;

    if (typeof value !== 'string' || client.user == null || interaction.guild == null) {
      await interaction.reply({
        content: 'Error! Please try again', ephemeral: true
      })
      return;
    }

    if (method === 'url') {
      const urls = value.match(new RegExp(URL, 'gm')) ?? [];
      const matches = urls.map((url) => url.match(URL));
      const embeds: Discord.EmbedBuilder[] = [];

      for (const match of matches) {
        if (
          !match?.groups?.channelId ||
          !match?.groups?.messageId ||
          !match?.groups?.guildId
        ) {
          continue;
        }

        const { guildId, channelId, messageId } = match.groups;

        if (guildId !== interaction.guild?.id) {
          continue;
        }

        const channel = await client.channels.fetch(channelId);

        if (!(channel instanceof Discord.TextChannel
          || channel instanceof Discord.ThreadChannel
          || channel instanceof Discord.NewsChannel)) {
          continue;
        }
        try {
          const quote = await channel.messages.fetch(messageId);
          embeds.push(await toEmbed(quote, client.user.username, client.user.displayAvatarURL()));
        } catch (e) {
          console.log("Error fetching message:", e);
        }
      }

      if (embeds.length === 0) {
        await interaction.reply({
          content: 'No message found at that link', ephemeral: true
        })
        return;
      }

      try {
        await interaction.reply({
          embeds: embeds
        })
      } catch (error) {
        await interaction.reply({
          content: 'Error! Please try again', ephemeral: true
        })
        console.log("Error sending quote:", error);
      }
    }
    else {
      if (interaction.channel?.type !== Discord.ChannelType.GuildText
        && interaction.channel?.type !== Discord.ChannelType.GuildPublicThread
        && interaction.channel?.type !== Discord.ChannelType.GuildNews) {
        await interaction.reply({
          content: 'I am unable to execute this in this channel', ephemeral: true
        })
        return;
      }

      const quote = await fetchMessageByText(value, interaction.channel, ['0']);

      if (quote == null) {
        await interaction.reply({
          content: 'No messages (in this channel and within the last 100) were found with that text. Try using a link instead', ephemeral: true
        })
        return;
      }

      try {
        await interaction.reply({
          embeds: [await toEmbed(quote, client.user.username, client.user.displayAvatarURL())]
        })
      } catch (error) {
        await interaction.reply({
          content: 'Error! Please try again', ephemeral: true
        })
        console.log("Error sending quote:", error);
      }
    }
  }
});

(async () => {
  await client.login(process.env.DISCORD_TOKEN);
})();

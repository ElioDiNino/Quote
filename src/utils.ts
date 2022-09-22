import Discord from 'discord.js';
import outdent from 'outdent';
import { URL, MARKDOWN } from './regexps';

export const not = <T extends unknown[]>(func: (...args: T) => boolean) => (
  ...args: T
) => !func(...args);

export const isBot = (message: Discord.Message) => message.author.bot;

export const match = (regexp: RegExp) => (message: Discord.Message) =>
  regexp.test(message.content);

export const fetchMessageByText = async (
  text: string,
  channel: Discord.Channel,
  excludes: string[] = [],
) => {
  if (!(channel instanceof Discord.TextChannel
    || channel instanceof Discord.ThreadChannel
    || channel instanceof Discord.NewsChannel)) {
    return;
  }

  return channel.messages
    .fetch({ limit: 100 })
    .then((messages) =>
      messages.find((message) => {
        return !excludes.includes(message.id) && message.content.includes(text);
      }),
    );
};

export const getNickname = async (message: Discord.Message) => {
  var member = undefined;
  try {
    member = await message?.guild?.members.fetch(message.author) ?? undefined;
  } catch (error) {
    console.log("Error fetching member:", error);
  }
  return member
    ? member.displayName
    : message.webhookId
      ? message.author.tag.slice(0, -5)
      : message.author.tag;
};

export const toEmbed = async (message: Discord.Message, quoteName: string, avatarURL: string) => {
  const nickname = await getNickname(message);
  const title =
    message.channel instanceof Discord.TextChannel
      ? message.channel.name
      : message.channel instanceof Discord.NewsChannel
        ? message.channel.name
        : message.channel instanceof Discord.ThreadChannel
          ? message.channel.name
          : message.channel.id;

  const embed = new Discord.EmbedBuilder()
    .setColor('#2f3136')
    .setTitle(`#${title}`)
    .setDescription(message.content != '' ? message.content : null)
    .setURL(message.url)
    .setTimestamp(message.createdTimestamp)
    .setFooter({ text: quoteName, iconURL: avatarURL });

  const avatar = message.author.displayAvatarURL({ extension: 'png', size: 64 });
  if (avatar) {
    embed.setAuthor({ name: nickname, iconURL: avatar });
  } else {
    embed.setAuthor({ name: nickname });
  }

  const image = message.attachments.first();
  if (image) embed.setImage(image.url);

  return embed;
};

export const helpEmbed = () => {
  const embed = new Discord.EmbedBuilder()
    .setColor('#ff677d')
    .setTitle("Quote Help")
    .setDescription(outdent`
    Quote allows you to quote messages in a better way!

    > \`> <text>\`
    Quote a message that contains \`<text>\` from the same channel and replace your message with an embed.

    > \`<URL>\`
    Quote a message by the \`<URL>\` and replace your message with an embed.

    > \`/quote <method> <value>\`
    Quote a message via either of the above methods with a slash command.

    See GitHub for more information:
    <https://github.com/ElioDiNino/Quote>
  `)
  return embed;
};

export const fetchWebhook = async (
  channel: Discord.TextChannel | Discord.NewsChannel,
  selfId: string,
) => {
  const webhook = await channel.fetchWebhooks().then((webhooks) =>
    webhooks.find(({ owner }) => {
      return owner instanceof Discord.User && owner.id === selfId;
    }),
  );

  if (webhook) return webhook;
  return channel.createWebhook({ name: process.env.DISCORD_WEBHOOK_NAME ?? 'quote' });
};

type WebhookSendParam = Discord.WebhookCreateMessageOptions & { split?: false };

export const mimic = async (
  content: string,
  original: Discord.Message,
  selfId: string,
  options: WebhookSendParam = {},
) => {
  if (!original.deletable) return;
  await original.delete();

  var webhook = undefined;
  if (original.channel instanceof Discord.ThreadChannel && original.channel.parent?.type === Discord.ChannelType.GuildText) {
    webhook = await fetchWebhook(original.channel.parent, selfId);
    options.threadId = original.channel.id;
  } else if (original.channel instanceof Discord.TextChannel || original.channel instanceof Discord.NewsChannel) {
    webhook = await fetchWebhook(original.channel, selfId);
  } else {
    return;
  }

  const avatarURL = original.author.displayAvatarURL();

  if (content !== '') {
    await webhook.send({
      content: content,
      avatarURL: avatarURL ?? undefined,
      username: await getNickname(original),
      ...options,
    });
  } else {
    await webhook.send({
      avatarURL: avatarURL ?? undefined,
      username: await getNickname(original),
      ...options,
    });
  }
};

export const removeEmptyLines = (text: string) =>
  text.replace(/^\s*\n/gm, '').trim();

export const replaceRoleMentions = (
  message: Discord.Message,
  text: string) => {
  const roleRegex = /<@&(\d{17,19})>/g;
  return text
    .replace(/@here/g, '`@here`')
    .replace(/@everyone/g, '`@everyone`')
    .replace(roleRegex, (match, id) => {
      const role = message?.guild?.roles.cache.get(id);
      if (role?.mentionable) {
        return `<@&${role.id}>`;
      }
      return role ? `\`@${role.name}\`` : `\`${match}\``;
    }).trim();
};

/**
 * URL quotation
 * @example
 * https://discordapp.com/channels/123/456/789
 */
export const urlQuote = async (
  client: Discord.Client,
  value: String,
  message?: Discord.Message,
  interaction?: Discord.ChatInputCommandInteraction
    | Discord.MessageContextMenuCommandInteraction
    | Discord.UserContextMenuCommandInteraction) => {

  if (client.user == null
    || (interaction && interaction.guild == null)
    || (message && message.guild == null)) {
    if (interaction) {
      await interaction.reply({
        content: 'Error! Please try again', ephemeral: true
      })
    }
    return;
  }
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

    // Ensure that the guild is correct
    const { guildId, channelId, messageId } = match.groups;
    if ((interaction && guildId !== interaction.guild?.id)
      || (message && guildId !== message?.guild?.id)) {
      continue;
    }

    const channel = await client.channels.fetch(channelId);

    // Check that the channel type is accepted
    if (!(channel instanceof Discord.TextChannel
      || channel instanceof Discord.ThreadChannel
      || channel instanceof Discord.NewsChannel)) {
      continue;
    }
    try {
      // Fetch the message
      const quote = await channel.messages.fetch(messageId);
      // Check if the message has any embeds
      if (quote.embeds.length > 0) {
        for (const embed of quote.embeds) {
          // If there are any embeds from Quote bot, then include them
          if (embed.data.footer?.text === client.user.username && embed.data.author) {
            embeds.push(new Discord.EmbedBuilder()
              .setColor(embed.color)
              .setTitle(embed.data.title ? embed.data.title : null)
              .setDescription(embed.data.description ? embed.data.description : null)
              .setURL(embed.data.url ? embed.data.url : null)
              .setTimestamp(embed.data.timestamp ? Date.parse(embed.data.timestamp) : null)
              .setFooter({ text: embed.data.footer.text, iconURL: embed.data.footer.icon_url ? embed.data.footer.icon_url : undefined })
              .setAuthor({ name: embed.data.author.name, iconURL: embed.data.author.icon_url ? embed.data.author.icon_url : undefined })
              .setImage(embed.data.image?.url ? embed.data.image.url : null)
            )
          }
        }
      }
      // Make sure that the message isn't empty or that no embeds from Quote were found
      if (quote.content != '' || embeds.length == 0) {
        embeds.push(await toEmbed(quote, client.user.username, client.user.displayAvatarURL()));
      }
    } catch (e) {
      console.log("Error fetching message:", e);
    }
  }

  if (embeds.length === 0) {
    if (interaction) {
      await interaction.reply({
        content: 'No message found at that link', ephemeral: true
      })
    }
    return;
  }

  // Reverse the embeds array to make sure the newest message is at the top
  embeds.reverse()

  if (interaction) {
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
  else if (message) {
    var content = removeEmptyLines(
      message.content.replace(new RegExp(URL, 'gm'), ''),
    );

    // Replace role mentions with their names if the user doesn't have the right permissions
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
};

/**
 * Markdown style quotation
 * @example
 * > message
 */
export const textQuote = async (
  client: Discord.Client,
  text: string,
  message?: Discord.Message,
  interaction?: Discord.ChatInputCommandInteraction
    | Discord.MessageContextMenuCommandInteraction
    | Discord.UserContextMenuCommandInteraction) => {

  if (client.user == null) {
    if (interaction) {
      await interaction.reply({
        content: 'Error! Please try again', ephemeral: true
      })
    }
    return;
  }
  // Check that the channel type is accepted
  if ((message
    && message.channel.type !== Discord.ChannelType.GuildText
    && message.channel.type !== Discord.ChannelType.PublicThread
    && message.channel.type !== Discord.ChannelType.GuildAnnouncement)
    || (interaction
      && interaction.channel?.type !== Discord.ChannelType.GuildText
      && interaction.channel?.type !== Discord.ChannelType.PublicThread
      && interaction.channel?.type !== Discord.ChannelType.GuildAnnouncement)) {
    if (interaction) {
      await interaction.reply({
        content: 'I am unable to execute this in this channel', ephemeral: true
      })
    }
    return;
  }

  // Look for messages with the provided text
  var quote = null;
  if (interaction && interaction.channel) {
    quote = await fetchMessageByText(text, interaction.channel, ['0']);
  } else if (message) {
    quote = await fetchMessageByText(text, message.channel, [message.id]);
  }

  if (quote == null) {
    if (interaction) {
      await interaction.reply({
        content: 'No messages (in this channel and within the last 100) were found with that text. Try using a link instead', ephemeral: true
      })
    }
    return;
  }

  if (interaction) {
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
  } else if (message) {
    var content = removeEmptyLines(
      message.content.replace(new RegExp(MARKDOWN, 'gm'), ''),
    );

    // Replace role mentions with their names if the user doesn't have the right permissions
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
};

import Discord from 'discord.js';
import outdent from 'outdent';

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
    console.log("Error fetching member (the user is most likely no longer in the server)")
  }
  return member ? member.displayName : message.author.tag;
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
    .setDescription(message.content)
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

type WebhookSendParam = Discord.WebhookMessageOptions & { split?: false };

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
}

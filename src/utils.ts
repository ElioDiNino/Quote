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
  if (!(channel instanceof Discord.TextChannel)) {
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

export const getNickname = (message: Discord.Message) => {
  const member = message?.member?.displayName;
  return member ? member : message.author.tag;
};

export const toEmbed = (message: Discord.Message, quoteName: string, avatarURL: string) => {
  const nickname = getNickname(message);
  const title =
    message.channel instanceof Discord.TextChannel
      ? message.channel.name
      : message.channel.id;

  const embed = new Discord.MessageEmbed()
    .setColor('#2f3136')
    .setTitle(`#${title}`)
    .setDescription(message.content)
    .setURL(message.url)
    .setTimestamp(message.createdTimestamp)
    .setFooter({ text: quoteName, iconURL: avatarURL });

  const avatar = message.author.displayAvatarURL({ format: 'png', size: 64 });
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
  const embed = new Discord.MessageEmbed()
    .setColor('#ff677d')
    .setTitle("Quote Help")
    .setDescription(outdent`
    Quote allows you to quote messages in a better way!

    > \`> <text>\`
    Quote a message that contains \`<text>\` from the same channel and replace your message with an embed.

    > \`<URL>\`
    Quote a message by the \`<URL>\` and replace your message with an embed.

    See GitHub for more information:
    <https://github.com/ElioDiNino/Quote>
  `)
  return embed;
};

export const fetchWebhook = async (
  channel: Discord.TextChannel,
  selfId: string,
) => {
  const webhook = await channel.fetchWebhooks().then((webhooks) =>
    webhooks.find(({ owner }) => {
      return owner instanceof Discord.User && owner.id === selfId;
    }),
  );

  if (webhook) return webhook;
  return channel.createWebhook(process.env.DISCORD_WEBHOOK_NAME ?? 'quote');
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

  if (!(original.channel instanceof Discord.TextChannel)) return;
  const webhook = await fetchWebhook(original.channel, selfId);
  const avatarURL = original.author.displayAvatarURL();

  if (content !== '') {
    await webhook.send({
      content: content,
      avatarURL: avatarURL ?? undefined,
      username: getNickname(original),
      ...options,
    });
  } else {
    await webhook.send({
      avatarURL: avatarURL ?? undefined,
      username: getNickname(original),
      ...options,
    });
  }
};

export const removeEmptyLines = (text: string) =>
  text.replace(/^\s*\n/gm, '').trim();

import path from 'path';
import dotenv from 'dotenv';
import Discord from 'discord.js';
import { fromEvent } from 'rxjs';
import { first, filter } from 'rxjs/operators';

import {
  mimic,
  toEmbed,
  isBot,
  match,
  not,
  fetchMessageByText,
  removeEmptyLines,
  helpEmbed,
} from './utils';
import { URL, MARKDOWN } from './regexps';

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_WEBHOOKS
  ]
});
const ready$ = fromEvent<void>(client, 'ready');
const message$ = fromEvent<Discord.Message>(client, 'messageCreate');

ready$.pipe(first()).subscribe(async () => {
  if (client.user == null) {
    return;
  }

  console.log(`Logged in as ${client.user.tag}`);

  await client.user.setActivity({
    type: 'LISTENING',
    name: '/help',
  });
});

/**
 * Help
 * @example
 * /help
 */
message$
  .pipe(
    filter((message) => message.content.startsWith('$help')),
    filter(not(isBot)),
  )
  .subscribe(async (message) => {
    await message.channel.send({ embeds: [helpEmbed()] });
  });

/**
 * Markdown style quotation
 * @example
 * > message
 */
message$
  .pipe(filter(not(isBot)), filter(match(MARKDOWN)))
  .subscribe(async (message) => {
    if (client.user == null) {
      return;
    }

    const fragments = message.content.match(new RegExp(MARKDOWN, 'gm')) ?? [];
    const text = fragments
      .map((fragment) => fragment.match(MARKDOWN)?.groups?.text)
      .filter((match) => match != null)
      .join('\n');

    if (message.channel.type !== 'GUILD_TEXT' && message.channel.type !== 'GUILD_PUBLIC_THREAD') {
      return;
    }

    const quote = await fetchMessageByText(text, message.channel, [message.id]);

    if (quote == null) {
      return;
    }

    const content = removeEmptyLines(
      message.content.replace(new RegExp(MARKDOWN, 'gm'), ''),
    );

    await mimic(content, message, client.user.id, {
      embeds: [await toEmbed(quote, client.user.username, client.user.displayAvatarURL())],
    });
  });

/**
 * URL quotation
 * @example
 * https://discordapp.com/channels/123/456/789
 */
message$
  .pipe(filter(not(isBot)), filter(match(URL)))
  .subscribe(async (message) => {
    if (client.user == null || message.guild == null) {
      return;
    }

    const urls = message.content.match(new RegExp(URL, 'gm')) ?? [];
    const matches = urls.map((url) => url.match(URL));
    const embeds: Discord.MessageEmbed[] = [];

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

      if (!(channel instanceof Discord.TextChannel || channel instanceof Discord.ThreadChannel)) {
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

    const content = removeEmptyLines(
      message.content.replace(new RegExp(URL, 'gm'), ''),
    );

    await mimic(content, message, client.user.id, {
      embeds,
    });
  });

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'help') {
    await interaction.reply({
      embeds: [helpEmbed()], ephemeral: true
    })
  }
});

(async () => {
  await client.login(process.env.DISCORD_TOKEN);
})();

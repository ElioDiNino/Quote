# <img alt="Quote" src="https://github.com/ElioDiNino/Quote/tree/main/static/logo.png" width="280px" />

![Banner](https://github.com/ElioDiNino/Quote/tree/main/static/banner.png)

> Quote allows you to quote messages in a better way


### **[See the original source repository](https://github.com/nakayoshi/quote)**

## Usage

### `<url>`

Quote a message by the URL and replace your message with an embed.

### `/quote <method> <value>`

Quote a message via either a URL (as above) or by matching a message that contains text from the same channel.

### `/help` or `$help`

Shows the help menu

## How it works

Quote uses Discord's Webhook API to send messages with a customized username and an avatar. It deletes the original message and uses this technique to pretend the message as if it was sent by another user.

## Required Permissions
- Manage Webhooks
- Read Messages
- Send Messages
- Manage Messages
- Embed Links
- Read Message History

## FAQ

### Quote didn't find the message despite I used the command properly

Due to Discord's API limitation, the number of messages you can go back is restricted up to 100. Alternatively, we provide another way that uses URL to quote so you can use it to avoid the issue.

### Quote doesn't work on my server! What's wrong?
There's several possible scenarios. Check the following cases:

- #### Permissons issue
    - See *Required Permissions* section above and give enough permissions for running Quote.

- #### 2FA (Two-factor Authentication) is required on your server
    - Since Quote using some admin-level features such as "Manage Messages", you need to disable 2FA otherwise it will not work properly.

### Why my message has a badge _BOT_?

Since Quote uses Discord's Webhook API to replace your message, the embed was actually sent by the bot though it is pretended as if you sent it.

## Deployment
### Requirements
 - Node.js >= 20
 - npm
 - Git

First of all, clone this repository using git.

```
git clone https://github.com/ElioDiNino/Quote.git
```

Copy the example of configuration file then edit it

```
cp .env.example .env
nano .env
```

Here's the detail of the environment variables

| env | nullability | description |
| :-  | :- | :- |
| `DISCORD_TOKEN` | **required** | Access token of your Discord bot |
| `CLIENT_ID` | **required** | The Client ID of your bot for slash command deployment |
| `GUILD_ID` | optional | Specify a Server/Guild ID to deploy slash commands to a single server instead of globally (blank otherwise) |
| `DISCORD_WEBHOOK_NAME` | optional | Namespace of Webhook API which will be used for identifying channels. Defaults to `quote` |
| `NODE_ENV` | optional | You can set `production` to enable some optimizations | 

Then, install Node.js dependencies with npm

```
npm install
```

Then build the program written in TypeScript into runnable JavaScript

```
npm run build
```

Then, deploy the bot's slash commands to Discord

```
npm run deploy
```

Finally, you can start the bot with the following command:

```
npm run start
```

### Removing Slash Commands

If you want to remove the slash commands from your server, you can use the following command. You will be prompted for the command ID to remove.

```
npm run remove
```

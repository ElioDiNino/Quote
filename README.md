# <img alt="Quote" src="https://i.imgur.com/iqDW7gp.png" width="280px" />

![eyecatch](https://i.imgur.com/dlglta1.png)

> Quote allows you to quote messages in a better way


### **[See the source repository](https://github.com/nakayoshi/quote)**

<br />

## Usage

### `> <text>`

Quote a message that contains `text` from the same channel and replace your message with an embed.

### `<url>`

Quote a message by the URL and replace your message with an embed.

### `$help`

Shows the help menu

<br />

## How it works

Quote uses Discord's Webhook API to send messages with a customised username and an avatar. It deletes the original message and uses this technique to pretend the message as if it was sent by another user.

<br />

## Required Permissions
- Manage Webhooks
- Read Messages
- Send Messages
- Manage Messages
- Embed Links
- Read Message History

<br />

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

<br />

## Deployment
### Requirements
 - Node.js >= 12
 - Yarn
 - Git

First of all, clone this repository using git.

```
git clone https://github.com/nakayoshi/quote.git
```

Copy the example of configuration file then edit it

```
cp .env.example .env
vim .env
```

Here's the detail of the environment variables

| env | nullability | description |
| :-  | :- | :- |
| `DISCORD_TOKEN` | **required** | Access token of your Discord bot |
| `DISCORD_WEBHOOK_NAME` | optional | Namespace of Webhook API which will be used for identifying channels. Defaults to `quote` |
| `NODE_ENV` | optional | You can set `production` to enable some optimisations | 

Then create a storage file

```
touch persistence.json
echo "{}" > persistence.json
```

Then, install Node.js dependencies with Yarn

```
yarn
```

Then build the programme written in TypeScript into runnable JavaScript

```
yarn run build
```

Finally, you can start the bot by the following command:

```
node ./dist/index.js
```

# Telegram Summary Bot

A Telegram bot that monitors group conversations and provides AI-powered summaries of chat discussions. Perfect for keeping track of important conversations and catching up on missed discussions.

## Features

- 🤖 Monitors group chat messages
- 📊 Stores conversation history in PostgreSQL database
- 🧠 Generates AI-powered summaries of conversations
- ⚡ Real-time message processing
- 🔐 Secure environment variable configuration

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- OpenAI API Key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/richcahill/builderberg-bot
cd telegram-summary-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with the following variables:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=your_postgresql_database_url
```

4. Set up the database:
The application will automatically create the necessary database tables on startup.

## Bot Configuration

Before running the bot, you need to configure it properly with @BotFather:

1. Message [@BotFather](https://t.me/botfather) in Telegram
2. Use `/setcommands` and send this list of commands:
```
start - Start the bot and show welcome message
summarize - Summarize the last 20 messages
summarize_day - Summarize all messages from today
summarize_week - Summarize all messages from the last 7 days
help - Show available commands and usage
```
3. Use `/setjoingroups` and select `Enable` to allow the bot to be added to groups
4. Use `/setprivacy` and select `Disable` to allow the bot to see all messages in groups
5. If you've previously added the bot to any groups, remove and re-add it for the new settings to take effect

## Usage

1. Start the bot:
```bash
node src/index.js
```

2. Add the bot to your Telegram group:
   - Open your Telegram group
   - Add the bot as an administrator
   - Grant necessary permissions (read messages, send messages)

3. The bot will automatically start monitoring messages and storing them in the database.

## Commands

Available commands for interacting with the bot:

- `/start` - Start the bot and display the welcome message
- `/help` - Show all available commands and usage instructions
- `/summarize` - Generate a summary of the last 20 messages in the chat
- `/summarize_day` - Generate a summary of all messages sent today (since 00:01 GMT)
- `/summarize_week` - Generate a summary of all messages from the last 7 days

Note: The bot must be an administrator in the group chat for all features to work correctly. Ensure the bot has permissions to read and send messages.

## Database Schema

The bot uses a PostgreSQL database with the following main tables:

- `telegram_group`: Stores information about Telegram groups
- `message`: Stores individual messages from the groups

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License. See [LICENSE](LICENSE) file for details.

## Support

For support, please [create an issue](https://github.com/richcahill/builderberg-bot/issues) on GitHub.
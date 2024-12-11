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
git clone [your-repository-url]
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

- `/summarize` - Generates a summary of recent messages in the chat
- More commands coming soon!

## Database Schema

The bot uses a PostgreSQL database with the following main tables:

- `telegram_group`: Stores information about Telegram groups
- `message`: Stores individual messages from the groups

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Your chosen license]

## Support

For support, please [create an issue](your-repository-url/issues) on GitHub.

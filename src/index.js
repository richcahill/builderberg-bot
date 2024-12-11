require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const BotCommands = require('./bot/commands');

// Initialize Express
const app = express();
const port = 5000;

// Initialize Telegram Bot
console.log('Initializing Telegram bot...');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Add bot error handler
bot.on('error', (error) => {
  console.error('Telegram bot error:', error.message);
});

// Add polling error handler
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

// Initialize bot commands
const botCommands = new BotCommands(bot, process.env.OPENAI_API_KEY);
botCommands.setupCommands();

// Log successful bot initialization
bot.getMe().then((botInfo) => {
  console.log('Bot initialized successfully!');
  console.log(`Bot username: @${botInfo.username}`);
}).catch((error) => {
  console.error('Error getting bot info:', error.message);
});

// Express routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start the server
async function startServer() {
  try {
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start everything
startServer().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

// Graceful shutdown handler
async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  try {
    console.log('Stopping Telegram bot...');
    bot.close();
    console.log('Cleanup complete. Exiting...');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
}

// Handle termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

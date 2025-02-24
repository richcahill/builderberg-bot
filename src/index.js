require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const BotCommands = require('./bot/commands');

// Initialize Express
const app = express();
const port = 5000;

// Verify bot token
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set!');
  process.exit(1);
}

console.log('Starting bot initialization...');
console.log(`Token length: ${token.length} characters`);

// Initialize Telegram Bot with polling
console.log('Initializing Telegram bot with polling...');
const bot = new TelegramBot(token, { 
  polling: true,
  filepath: false // Disable file downloads
});

// Add text message listener for verification
bot.on('text', (msg) => {
  console.log('=== Received Message ===');
  console.log(`From: ${msg.from.username || msg.from.first_name}`);
  console.log(`Chat ID: ${msg.chat.id}`);
  console.log(`Message: ${msg.text}`);
  console.log('=====================');
});

// Add detailed error handler
bot.on('error', (error) => {
  console.error('=== Telegram Bot Error ===');
  console.error('Error message:', error.message);
  console.error('Full error:', error);
  console.error('=========================');
});

// Add detailed polling error handler
bot.on('polling_error', (error) => {
  console.error('=== Polling Error ===');
  console.error('Error message:', error.message);
  if (error.code === 'ETELEGRAM') {
    console.error('Telegram API Error:', error.response?.body);
  }
  console.error('Full error:', error);
  console.error('===================');
});

// Initialize bot commands with detailed logging
console.log('Initializing bot commands...');
const botCommands = new BotCommands(bot, process.env.OPENAI_API_KEY);

// Get and log bot information
bot.getMe().then((botInfo) => {
  console.log('=== Bot Information ===');
  console.log('Bot initialized successfully!');
  console.log('Configuration:', {
    id: botInfo.id,
    username: botInfo.username,
    firstName: botInfo.first_name,
    canJoinGroups: botInfo.can_join_groups,
    canReadAllGroupMessages: botInfo.can_read_all_group_messages
  });
  console.log('=====================');
}).catch((error) => {
  console.error('Failed to get bot information:', error);
  process.exit(1);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    botInitialized: true,
    timestamp: new Date().toISOString()
  });
});

// Start the server
async function startServer() {
  try {
    // First ensure database is initialized
    const { sequelize } = require('./database');
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Start express server
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
  console.error('Fatal error:', error);
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
    bot.stopPolling();
    console.log('Cleanup complete. Exiting...');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
}

// Handle termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
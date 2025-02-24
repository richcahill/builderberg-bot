require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const BotCommands = require('./bot/commands');

// Initialize Express
const app = express();
const port = 5000;

// Initialize Telegram Bot with webhook instead of polling
console.log('Initializing Telegram bot...');
const WEBHOOK_PATH = '/webhook/' + process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.REPLIT_SLUG ? `https://${process.env.REPLIT_SLUG}.repl.co` : `http://localhost:${port}`;
const webhookUrl = url + WEBHOOK_PATH;

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  webHook: {
    port: port,
    autoOpen: false
  }
});

// Add bot error handler
bot.on('error', (error) => {
  console.error('Telegram bot error:', error.message);
});

// Initialize bot commands
console.log('Initializing bot commands and message listener...');
const botCommands = new BotCommands(bot, process.env.OPENAI_API_KEY);

// Express middleware
app.use(express.json());

// Webhook endpoint
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start the server and set webhook
async function startServer() {
  try {
    // First ensure database is initialized
    const { sequelize } = require('./database');
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Start express server
    app.listen(port, '0.0.0.0', async () => {
      console.log(`Server is running on port ${port}`);

      try {
        // Delete any existing webhook
        await bot.deleteWebHook();

        // Set the webhook
        const webhookInfo = await bot.setWebHook(webhookUrl);
        if (webhookInfo) {
          console.log(`Webhook set successfully to ${webhookUrl}`);
        } else {
          throw new Error('Failed to set webhook');
        }
      } catch (error) {
        console.error('Error setting webhook:', error);
        process.exit(1);
      }
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
    console.log('Removing webhook...');
    await bot.deleteWebHook();
    console.log('Cleanup complete. Exiting...');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
}

// Handle termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
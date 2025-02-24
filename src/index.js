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

// Get Replit URL using REPL_ID and REPL_OWNER
const REPL_OWNER = process.env.REPL_OWNER;
const REPL_ID = process.env.REPL_ID;
const url = `https://${REPL_ID}.id.repl.co`;
const webhookUrl = url + WEBHOOK_PATH;

console.log('Setting up webhook URL:', webhookUrl);

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

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Webhook endpoint
app.post(WEBHOOK_PATH, (req, res) => {
  console.log('Received webhook update from Telegram');
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
        console.log('Removing existing webhook...');
        await bot.deleteWebHook();

        // Set the webhook
        console.log(`Setting webhook to ${webhookUrl}`);
        const webhookInfo = await bot.setWebHook(webhookUrl);
        if (webhookInfo) {
          console.log('Webhook set successfully');

          // Verify webhook info
          const info = await bot.getWebHookInfo();
          console.log('Current webhook info:', info);
        } else {
          throw new Error('Failed to set webhook');
        }
      } catch (error) {
        console.error('Error setting webhook:', error);
        // Don't exit the process, keep the server running
        console.log('Server will continue running despite webhook error');
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

// Keep the process running
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

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
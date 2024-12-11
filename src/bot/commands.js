const Summarizer = require('./summarizer');
const MessageFormatter = require('./formatter');

class BotCommands {
  constructor(bot, openaiApiKey) {
    this.bot = bot;
    this.summarizer = new Summarizer(openaiApiKey);
    this.setupMessageListener();
  }

  setupMessageListener() {
    // Store all incoming messages
    this.bot.on('message', async (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        try {
          const { Message, TelegramGroup } = require('../database');
          
          // Ensure group exists in database
          await TelegramGroup.findOrCreate({
            where: { 
              id: msg.chat.id 
            },
            defaults: {
              title: msg.chat.title || 'Unknown Group',
              join_date: new Date(),
              is_active: true
            }
          });

          // Store message
          await Message.create({
            telegram_message_id: msg.message_id,
            group_id: msg.chat.id,
            user_id: msg.from.id,
            username: msg.from.username || 'Unknown',
            content: msg.text,
            timestamp: new Date(msg.date * 1000)
          });

          console.log(`Stored message from ${msg.from.username || 'Unknown'}: ${msg.text}`);
        } catch (error) {
          console.error('Error storing message:', error);
        }
      }
    });
  }

  async fetchMessages(chatId, options = {}) {
    try {
      const { limit = 20, since = null } = options;
      console.log(`Fetching messages for chat ${chatId} with limit ${limit}${since ? ` since ${since.toISOString()}` : ''}`);
      
      const { Message } = require('../database');
      const { Op } = require('sequelize');

      // Build query conditions
      const where = {
        group_id: chatId
      };
      
      if (since) {
        where.timestamp = {
          [Op.gte]: since
        };
      }

      // Fetch messages from database
      const messages = await Message.findAll({
        where,
        order: [['timestamp', 'DESC']],
        limit,
        raw: true
      });

      console.log(`Retrieved ${messages.length} messages from database`);
      
      // Log each message for debugging
      messages.forEach(msg => {
        console.log(`Message from ${msg.username} at ${msg.timestamp}: "${msg.content}"`);
      });

      // Format messages for summarization
      const formattedMessages = messages.map(msg => `${msg.username}: ${msg.content}`);
      console.log('Messages to summarize:', formattedMessages);
      
      return formattedMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  getStartOfDay() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  getStartOfWeek() {
    const startOfDay = this.getStartOfDay();
    startOfDay.setUTCDate(startOfDay.getUTCDate() - 7);
    return startOfDay;
  }

  setupCommands() {
    // Set up bot commands in Telegram
    this.bot.setMyCommands([
      { command: 'summarize', description: 'Summarize the last 20 messages' },
      { command: 'summarize_day', description: 'Summarize all messages from today' },
      { command: 'summarize_week', description: 'Summarize all messages from the last 7 days' },
      { command: 'help', description: 'Show available commands and usage' }
    ]);

    // Help command handler
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const helpText = `
Available commands:
/summarize - Summarize the last 20 messages
/summarize_day - Summarize all messages sent since 00:01 GMT today
/summarize_week - Summarize all messages sent in the last 7 days
/help - Show this help message

How to use:
1. Add the bot to your group chat
2. Send some messages in the chat
3. Use any of the summarize commands to get an AI-generated summary
`;
      await this.bot.sendMessage(chatId, helpText);
    });

    // Last 20 messages summarize handler
    this.bot.onText(/\/summarize/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        console.log(`Received summarize request for last 20 messages from chat ${chatId}`);
        const messages = await this.fetchMessages(chatId, { limit: 20 });
        await this.generateAndSendSummary(chatId, messages, "Last 20 Messages");
      } catch (error) {
        console.error('Error in summarize command:', error);
        await this.bot.sendMessage(chatId, "Sorry, I couldn't generate a summary at this time. Please try again later.");
      }
    });

    // Today's messages summarize handler
    this.bot.onText(/\/summarize_day/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        console.log(`Received summarize request for today's messages from chat ${chatId}`);
        const messages = await this.fetchMessages(chatId, { 
          limit: 100,
          since: this.getStartOfDay()
        });
        await this.generateAndSendSummary(chatId, messages, "Today's Messages");
      } catch (error) {
        console.error('Error in summarize_day command:', error);
        await this.bot.sendMessage(chatId, "Sorry, I couldn't generate a summary at this time. Please try again later.");
      }
    });

    // Week's messages summarize handler
    this.bot.onText(/\/summarize_week/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        console.log(`Received summarize request for week's messages from chat ${chatId}`);
        const messages = await this.fetchMessages(chatId, {
          limit: 100,
          since: this.getStartOfWeek()
        });
        await this.generateAndSendSummary(chatId, messages, "Last 7 Days' Messages");
      } catch (error) {
        console.error('Error in summarize_week command:', error);
        await this.bot.sendMessage(chatId, "Sorry, I couldn't generate a summary at this time. Please try again later.");
      }
    });
  }

  async generateAndSendSummary(chatId, messages, timeframe) {
    if (messages.length === 0) {
      console.log(`No messages found for ${timeframe}`);
      await this.bot.sendMessage(chatId, `No messages to summarize for ${timeframe}! Send some messages first.`);
      return;
    }

    console.log(`Generating summary for ${messages.length} messages from ${timeframe}`);
    const summary = await this.summarizer.generateSummary(messages);
    const formattedSummary = MessageFormatter.formatSummary(summary);
    
    console.log('Sending formatted summary to chat');
    await this.bot.sendMessage(chatId, formattedSummary, { parse_mode: 'HTML' });
  }
}

module.exports = BotCommands;

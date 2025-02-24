const Summarizer = require('./summarizer');
const MessageFormatter = require('./formatter');

class BotCommands {
  constructor(bot, openaiApiKey) {
    console.log('Initializing BotCommands...');
    this.bot = bot;
    this.summarizer = new Summarizer(openaiApiKey);

    // Remove ALL existing listeners first
    this.bot.removeAllListeners();
    console.log('Cleared all existing bot listeners');

    // Initialize bot functionality
    this._initializeBot();
  }

  async _initializeBot() {
    try {
      // Check bot permissions
      const botInfo = await this.bot.getMe();
      console.log('Bot configuration:', {
        id: botInfo.id,
        username: botInfo.username,
        firstName: botInfo.first_name,
        canJoinGroups: botInfo.can_join_groups,
        canReadAllGroupMessages: botInfo.can_read_all_group_messages,
        supportsInlineQueries: botInfo.supports_inline_queries
      });

      if (!botInfo.can_read_all_group_messages) {
        console.warn('\n⚠️ IMPORTANT: Privacy mode is enabled for this bot!');
        console.warn('To allow the bot to read group messages, please:');
        console.warn('1. Message @BotFather');
        console.warn('2. Use /mybots command');
        console.warn('3. Select this bot');
        console.warn('4. Go to Bot Settings > Group Privacy');
        console.warn('5. Disable privacy mode');
        console.warn('6. Remove and re-add the bot to your groups\n');
      }

      // Set up commands and listeners
      await this._setupCommands();
      this._setupMessageListener();
    } catch (error) {
      console.error('Error initializing bot:', error);
      throw error;
    }
  }

  _setupMessageListener() {
    // Handle new chat members (including the bot itself)
    this.bot.on('new_chat_members', async (msg) => {
      const newMembers = msg.new_chat_members;
      for (const member of newMembers) {
        if (member.is_bot && member.username === this.bot.options.username) {
          console.log(`Bot was added to chat "${msg.chat.title}" (ID: ${msg.chat.id})`);
          try {
            const chatAdmins = await this.bot.getChatAdministrators(msg.chat.id);
            const isBotAdmin = chatAdmins.some(admin =>
              admin.user.username === member.username
            );

            if (!isBotAdmin) {
              await this.bot.sendMessage(msg.chat.id,
                "⚠️ Please make me an administrator to ensure all features work correctly!"
              );
            }
          } catch (error) {
            console.error(`Error checking admin status in chat ${msg.chat.title}:`, error);
          }
        }
      }
    });

    // Store all incoming messages
    this.bot.on('message', async (msg) => {
      if (!msg.text || msg.text.startsWith('/')) return;

      try {
        const { Message, TelegramGroup } = require('../database');

        // Ensure group exists in database
        await TelegramGroup.findOrCreate({
          where: { id: msg.chat.id },
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

        console.log(`Stored message from ${msg.from.username || 'Unknown'} in chat ${msg.chat.id}`);
      } catch (error) {
        console.error('Error storing message:', error);
      }
    });
  }

  async _setupCommands() {
    try {
      // Register commands with Telegram
      await this.bot.setMyCommands([
        { command: 'start', description: 'Start the bot and show welcome message' },
        { command: 'summarize', description: 'Summarize the last 20 messages' },
        { command: 'summarize_day', description: 'Summarize all messages from today' },
        { command: 'summarize_week', description: 'Summarize all messages from the last 7 days' },
        { command: 'help', description: 'Show available commands and usage' }
      ]);

      // Start command handler
      this.bot.onText(/^\/start$/, async (msg) => {
        const welcomeMessage = `
👋 Hello! I'm your group chat summarizer bot.

I can help you keep track of conversations by providing AI-powered summaries. Here are my commands:

/summarize - Get a summary of the last 20 messages
/summarize_day - Get a summary of today's messages
/summarize_week - Get a summary of the last 7 days
/help - Show this help message

To get started:
1. Make sure I'm an admin in this group
2. Send some messages
3. Use any of the commands above to get a summary!
`;
        await this.bot.sendMessage(msg.chat.id, welcomeMessage);
      });

      // Help command handler
      this.bot.onText(/^\/help$/, async (msg) => {
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
        await this.bot.sendMessage(msg.chat.id, helpText);
      });

      // Summarize command handlers
      this.bot.onText(/^\/summarize$/, async (msg) => {
        try {
          const messages = await this.fetchMessages(msg.chat.id, { limit: 20 });
          await this.generateAndSendSummary(msg.chat.id, messages, "Last 20 Messages");
        } catch (error) {
          console.error('Error in summarize command:', error);
          await this.bot.sendMessage(msg.chat.id, "Sorry, I couldn't generate a summary at this time. Please try again later.");
        }
      });

      this.bot.onText(/^\/summarize_day$/, async (msg) => {
        try {
          const messages = await this.fetchMessages(msg.chat.id, {
            limit: 100,
            since: this.getStartOfDay()
          });
          await this.generateAndSendSummary(msg.chat.id, messages, "Today's Messages");
        } catch (error) {
          console.error('Error in summarize_day command:', error);
          await this.bot.sendMessage(msg.chat.id, "Sorry, I couldn't generate a summary at this time. Please try again later.");
        }
      });

      this.bot.onText(/^\/summarize_week$/, async (msg) => {
        try {
          const messages = await this.fetchMessages(msg.chat.id, {
            limit: 100,
            since: this.getStartOfWeek()
          });
          await this.generateAndSendSummary(msg.chat.id, messages, "Last 7 Days' Messages");
        } catch (error) {
          console.error('Error in summarize_week command:', error);
          await this.bot.sendMessage(msg.chat.id, "Sorry, I couldn't generate a summary at this time. Please try again later.");
        }
      });

    } catch (error) {
      console.error('Error setting up commands:', error);
      throw error;
    }
  }

  async fetchMessages(chatId, options = {}) {
    try {
      const { limit = 20, since = null } = options;
      const { Message } = require('../database');
      const { Op } = require('sequelize');

      const where = { group_id: chatId };
      if (since) {
        where.timestamp = { [Op.gte]: since };
      }

      const messages = await Message.findAll({
        where,
        order: [['timestamp', 'DESC']],
        limit,
        raw: true
      });

      return messages.map(msg => `${msg.username}: ${msg.content}`);
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

  async generateAndSendSummary(chatId, messages, timeframe) {
    if (messages.length === 0) {
      await this.bot.sendMessage(chatId, `No messages to summarize for ${timeframe}! Send some messages first.`);
      return;
    }

    const summary = await this.summarizer.generateSummary(messages);
    const formattedSummary = MessageFormatter.formatSummary(summary);
    await this.bot.sendMessage(chatId, formattedSummary, { parse_mode: 'HTML' });
  }
}

module.exports = BotCommands;
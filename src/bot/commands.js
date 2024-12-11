const Summarizer = require('./summarizer');
const MessageFormatter = require('./formatter');

class BotCommands {
  constructor(bot, openaiApiKey) {
    console.log('Initializing BotCommands...');
    this.bot = bot;
    this.summarizer = new Summarizer(openaiApiKey);
    
    // Check bot permissions on startup
    this.bot.getMe().then(botInfo => {
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
    }).catch(error => {
      console.error('Error getting bot info:', error);
    });

    console.log('Setting up message listener...');
    this.setupMessageListener();
    console.log('Message listener setup completed');
  }

  setupMessageListener() {
    // Handle new chat members (including the bot itself)
    this.bot.on('new_chat_members', async (msg) => {
      const newMembers = msg.new_chat_members;
      for (const member of newMembers) {
        if (member.is_bot && member.username === (await this.bot.getMe()).username) {
          console.log(`Bot was added to chat "${msg.chat.title}" (ID: ${msg.chat.id})`);
          try {
            const chatAdmins = await this.bot.getChatAdministrators(msg.chat.id);
            const isBotAdmin = chatAdmins.some(admin => 
              admin.user.username === member.username
            );
            console.log(`Bot admin status in "${msg.chat.title}":`, {
              isAdmin: isBotAdmin,
              totalAdmins: chatAdmins.length
            });
            
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
      // Check if bot has necessary permissions
      if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        try {
          // Get bot's own ID
          const botInfo = await this.bot.getMe();
          // Check bot's permissions in the group
          const botMember = await this.bot.getChatMember(msg.chat.id, botInfo.id);
          console.log(`Bot permissions in chat ${msg.chat.title}:`, {
            chatType: msg.chat.type,
            chatId: msg.chat.id,
            botId: botInfo.id,
            botUsername: botInfo.username,
            isAdmin: botMember.status === 'administrator',
            canReadMessages: botInfo.can_read_all_group_messages,
            permissions: botMember
          });

          if (!botInfo.can_read_all_group_messages) {
            console.warn(`⚠️ Privacy mode is enabled for bot ${botInfo.username}. Please disable it through @BotFather to read group messages.`);
          }
          
          if (botMember.status !== 'administrator') {
            console.warn(`⚠️ Bot ${botInfo.username} is not an administrator in chat ${msg.chat.title}. Some features may be limited.`);
          }
        } catch (error) {
          console.error(`Error checking bot permissions in chat ${msg.chat.title}:`, error.message);
          console.error('Full error:', error);
        }
      }
      // Log all incoming messages, including commands
      console.log(`\nReceived message in chat:
        Chat ID: ${msg.chat.id}
        Chat Type: ${msg.chat.type}
        Chat Title: ${msg.chat.title || 'Private Chat'}
        From User: ${msg.from.username || 'Unknown'} (ID: ${msg.from.id})
        Message Type: ${msg.text ? 'Text' : 'Other'}
        Content: ${msg.text ? (msg.text.startsWith('/') ? 'Command: ' + msg.text : 'Message: ' + msg.text) : 'Non-text content'}
        Timestamp: ${new Date(msg.date * 1000).toISOString()}
      `);

      if (msg.text && !msg.text.startsWith('/')) {
        console.log(`Processing new message:
          Chat ID: ${msg.chat.id}
          Message ID: ${msg.message_id}
          From: ${msg.from.username || 'Unknown'}
          Content: ${msg.text}
        `);
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

          console.log(`Successfully stored message in database:
            From: ${msg.from.username || 'Unknown'}
            Content: ${msg.text}
            Chat ID: ${msg.chat.id}
            Message ID: ${msg.message_id}
            Timestamp: ${new Date(msg.date * 1000).toISOString()}`);
        } catch (error) {
          console.error('Error storing message:', error);
          console.error('Error details:', error.message);
          if (error.parent) {
            console.error('Database error:', error.parent.message);
          }
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
      { command: 'start', description: 'Start the bot and show welcome message' },
      { command: 'summarize', description: 'Summarize the last 20 messages' },
      { command: 'summarize_day', description: 'Summarize all messages from today' },
      { command: 'summarize_week', description: 'Summarize all messages from the last 7 days' },
      { command: 'help', description: 'Show available commands and usage' }
    ]).then(() => {
      console.log('Bot commands registered successfully');
    }).catch(error => {
      console.error('Error registering bot commands:', error);
    });

    // Add start command handler
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
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
      await this.bot.sendMessage(chatId, welcomeMessage);
    });

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

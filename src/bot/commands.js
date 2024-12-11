const Summarizer = require('./summarizer');
const MessageFormatter = require('./formatter');

class BotCommands {
  constructor(bot, openaiApiKey) {
    this.bot = bot;
    this.summarizer = new Summarizer(openaiApiKey);
  }

  async fetchRecentMessages(chatId) {
    try {
      const messages = await this.bot.getUpdates({
        chat_id: chatId,
        limit: 100  // Fetch last 100 messages
      });
      
      return messages
        .filter(update => update.message && update.message.text)
        .map(update => update.message.text);
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  setupCommands() {
    // Set up bot commands in Telegram
    this.bot.setMyCommands([
      { command: 'ai_summarise', description: 'Generate an AI summary of recent chat messages' },
      { command: 'help', description: 'Show available commands and their usage' }
    ]);

    // Help command handler
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const helpText = `
Available commands:
/ai_summarise - Generate an AI summary of recent chat messages
/help - Show this help message

How to use:
1. Add the bot to your group chat
2. Send some messages in the chat
3. Use /ai_summarise to get a summary of recent messages
`;
      await this.bot.sendMessage(chatId, helpText);
    });

    // AI Summarize command handler
    this.bot.onText(/\/ai_summarise/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        console.log(`Received summarize request from chat ${chatId}`);

        // Fetch recent messages from chat
        const messages = await this.fetchRecentMessages(chatId);
        if (messages.length === 0) {
          console.log('No messages found for summarization');
          await this.bot.sendMessage(chatId, "No messages to summarize yet! Send some messages first.");
          return;
        }

        // Generate and format summary
        console.log(`Generating summary for ${messages.length} messages`);
        const summary = await this.summarizer.generateSummary(messages);
        const formattedSummary = MessageFormatter.formatSummary(summary);
        
        // Send the response
        console.log('Sending formatted summary to chat');
        await this.bot.sendMessage(chatId, formattedSummary, { parse_mode: 'HTML' });
      } catch (error) {
        console.error('Error in summarize command:', error);
        await this.bot.sendMessage(chatId, "Sorry, I couldn't generate a summary at this time. Please try again later.");
      }
    });
  }
}

module.exports = BotCommands;

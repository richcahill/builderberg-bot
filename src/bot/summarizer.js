const OpenAI = require("openai");

class Summarizer {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async generateSummary(messages) {
    if (!messages || messages.length === 0) {
      throw new Error("No messages provided for summarization");
    }

    try {
      console.log(`Attempting to summarize ${messages.length} messages...`);
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a precise assistant that summarizes Telegram conversations. Create concise, informative summaries that capture the key points and maintain conversation context.",
          },
          {
            role: "user",
            content: `Please summarize this Telegram conversation. Focus on key topics, decisions, and important points. Format as bullet points:\n\n${messages.join("\n")}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.2,
        frequency_penalty: 0.5,
      });

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error("No summary generated from OpenAI API");
      }

      console.log("Summary generated successfully");
      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error generating summary:", error);
      if (error.response) {
        console.error("OpenAI API Error:", {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw new Error("Failed to generate summary: " + (error.message || "Unknown error"));
    }
  }
}

module.exports = Summarizer;

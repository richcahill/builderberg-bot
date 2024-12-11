const OpenAI = require("openai");

class Summarizer {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async generateSummary(messages) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that summarizes conversations.",
          },
          {
            role: "user",
            content: `Please summarize the following conversation in brief, clear bullet points. Focus on the main topics and key points discussed:\n\n${messages.join("\n")}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error generating summary:", error);
      throw error;
    }
  }
}

module.exports = Summarizer;

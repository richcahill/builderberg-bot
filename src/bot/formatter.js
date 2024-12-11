class MessageFormatter {
  static formatSummary(summary, timeframe = "") {
    const header = `📝 <b>Conversation Summary${timeframe ? ` - ${timeframe}` : ""}</b>\n\n`;
    const formattedBody = summary
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => {
        if (line.startsWith("•") || line.startsWith("-")) {
          return "• " + line.slice(1).trim();
        }
        return "• " + line;
      })
      .join("\n");

    const timestamp = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
    const footer = `\n\n— <i>Builderberg Bot</i>,  ${timestamp}`;

    return header + formattedBody + footer;
  }
}

module.exports = MessageFormatter;

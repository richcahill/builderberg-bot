class MessageFormatter {
  static formatSummary(summary) {
    const header = '📝 <b>Conversation Summary</b>\n\n';
    const formattedBody = summary
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        if (line.startsWith('•') || line.startsWith('-')) {
          return '• ' + line.slice(1).trim();
        }
        return '• ' + line;
      })
      .join('\n');
    
    const footer = '\n\n<i>Generated by AI Summary Bot</i>';
    
    return header + formattedBody + footer;
  }
}

module.exports = MessageFormatter;

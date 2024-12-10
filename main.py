import asyncio
import logging
from telegram.ext import Application
from app import app
from bot.handler import setup_handlers
from config import TELEGRAM_BOT_TOKEN

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def run_bot():
    """Run the Telegram bot"""
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    setup_handlers(application)
    await application.initialize()
    await application.start()
    await application.run_polling()

def run_flask():
    """Run the Flask application"""
    app.run(host="0.0.0.0", port=5000, debug=True)

if __name__ == "__main__":
    try:
        # Run both Flask and the Telegram bot
        loop = asyncio.get_event_loop()
        loop.create_task(run_bot())
        run_flask()
    except Exception as e:
        logger.error(f"Error starting application: {str(e)}")

import asyncio
import logging
import threading
from telegram.ext import Application
from app import app
from bot.handler import setup_handlers
from config import TELEGRAM_BOT_TOKEN

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def run_flask():
    """Run the Flask application"""
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)

async def run_bot():
    """Run the Telegram bot"""
    try:
        application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
        setup_handlers(application)
        
        logger.info("Starting Telegram bot...")
        await application.initialize()
        await application.start()
        logger.info("Telegram bot started successfully!")
        
        # Use run_polling without await as it manages its own event loop
        await application.run_polling(allowed_updates=["message"], close_loop=False)
    except Exception as e:
        logger.error(f"Error in Telegram bot: {str(e)}")
        if not isinstance(e, KeyboardInterrupt):
            raise

def run_flask_thread():
    """Run Flask in a separate thread"""
    threading.Thread(target=run_flask).start()

async def main():
    """Main function to run both Flask and Telegram bot"""
    try:
        # Start Flask in a separate thread
        run_flask_thread()
        logger.info("Flask server started in background thread")
        
        # Run the Telegram bot in the main thread
        await run_bot()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    except Exception as e:
        logger.error(f"Error in main: {str(e)}")
        raise
    finally:
        logger.info("Shutting down application...")

if __name__ == "__main__":
    try:
        # Create new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(main())
    except KeyboardInterrupt:
        logger.info("Application stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
    finally:
        loop.close()

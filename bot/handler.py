import logging
from telegram import Update
from telegram.ext import (
    Application,
    ContextTypes,
    MessageHandler,
    CommandHandler,
    filters
)
from models import Message, TelegramGroup
from app import db
from bot.summarizer import generate_summary
from bot.formatter import format_summary
from utils.cache import cache

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def store_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Store incoming messages in the database"""
    try:
        group = await get_or_create_group(update.effective_chat.id, update.effective_chat.title)
        
        message = Message(
            telegram_message_id=update.message.message_id,
            group_id=group.id,
            user_id=update.effective_user.id,
            username=update.effective_user.username or update.effective_user.first_name,
            content=update.message.text
        )
        
        db.session.add(message)
        db.session.commit()
        
    except Exception as e:
        logger.error(f"Error storing message: {str(e)}")

async def get_or_create_group(group_id: int, title: str) -> TelegramGroup:
    """Get or create a Telegram group in the database"""
    group = TelegramGroup.query.get(group_id)
    if not group:
        group = TelegramGroup(id=group_id, title=title)
        db.session.add(group)
        db.session.commit()
    return group

async def summarize_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle the /ai_summarise command"""
    try:
        # Check cache first
        cache_key = f"summary_{update.effective_chat.id}"
        cached_summary = cache.get(cache_key)
        
        if cached_summary:
            await update.message.reply_text(cached_summary, parse_mode='HTML')
            return

        # Get recent messages
        messages = Message.query.filter_by(group_id=update.effective_chat.id)\
            .order_by(Message.timestamp.desc())\
            .limit(20)\
            .all()
        
        if not messages:
            await update.message.reply_text("No messages to summarize yet!")
            return

        # Generate and format summary
        summary = await generate_summary([msg.content for msg in messages])
        formatted_summary = format_summary(summary)
        
        # Cache the formatted summary
        cache.set(cache_key, formatted_summary, timeout=3600)
        
        await update.message.reply_text(formatted_summary, parse_mode='HTML')
        
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        await update.message.reply_text("Sorry, I couldn't generate a summary at this time.")

def setup_handlers(application: Application):
    """Setup all bot handlers"""
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, store_message))
    application.add_handler(CommandHandler("ai_summarise", summarize_command))

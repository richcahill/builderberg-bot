import os

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', 'your-bot-token')

# OpenAI Configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'your-openai-key')

# Database Configuration
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Redis Configuration
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Bot Settings
MAX_MESSAGES_TO_SUMMARIZE = 20
CACHE_TIMEOUT = 3600  # 1 hour

import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from flask_migrate import Migrate

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define base class for SQLAlchemy models
class Base(DeclarativeBase):
    pass

# Initialize SQLAlchemy with the base class
db = SQLAlchemy(model_class=Base)

# Create Flask application
app = Flask(__name__)

# Configure the application
app.config.update(
    # Database configuration
    SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL"),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    SQLALCHEMY_ENGINE_OPTIONS={
        "pool_recycle": 300,  # Recycle connections every 5 minutes
        "pool_pre_ping": True,  # Enable connection health checks
        "pool_size": 10,  # Maximum pool size
        "max_overflow": 20,  # Maximum number of connections to create beyond pool_size
    },
    # Security configuration
    SECRET_KEY=os.environ.get("FLASK_SECRET_KEY", "a-very-secret-key"),
)

# Initialize SQLAlchemy with app
db.init_app(app)

# Initialize Flask-Migrate
migrate = Migrate(app, db)

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    logger.error(f"404 error: {error}")
    return {"error": "Resource not found"}, 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 error: {error}")
    db.session.rollback()  # Rollback session in case of database errors
    return {"error": "Internal server error"}, 500

# Create database tables within application context
with app.app_context():
    # Import models here to avoid circular imports
    from models import TelegramGroup, Message  # noqa: F401
    
    try:
        db.create_all()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

# Health check endpoint
@app.route('/health')
def health_check():
    return {"status": "healthy"}, 200

# Import routes and register blueprints here if needed
# Note: Current implementation doesn't require route handlers as it's primarily a bot backend

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

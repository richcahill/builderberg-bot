from typing import List
from models import Message
from app import db

def get_recent_messages(group_id: int, limit: int = 20) -> List[Message]:
    """Retrieve recent messages for a group"""
    return Message.query.filter_by(group_id=group_id)\
        .order_by(Message.timestamp.desc())\
        .limit(limit)\
        .all()

def cleanup_old_messages(group_id: int, days: int = 7):
    """Clean up messages older than specified days"""
    from datetime import datetime, timedelta
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    Message.query.filter(
        Message.group_id == group_id,
        Message.timestamp < cutoff_date
    ).delete()
    
    db.session.commit()

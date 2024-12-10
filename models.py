from datetime import datetime
from app import db

class TelegramGroup(db.Model):
    id = db.Column(db.BigInteger, primary_key=True)
    title = db.Column(db.String(255))
    join_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    messages = db.relationship('Message', backref='group', lazy=True)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    telegram_message_id = db.Column(db.BigInteger)
    group_id = db.Column(db.BigInteger, db.ForeignKey('telegram_group.id'))
    user_id = db.Column(db.BigInteger)
    username = db.Column(db.String(255))
    content = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Message {self.id} from {self.username}>'

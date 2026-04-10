"""
app/models/message.py — SQLAlchemy Message Model
"""

from datetime import datetime, timezone
from app.extensions import db

class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Relationships
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Message Content
    content = db.Column(db.Text, nullable=False)
    
    # Metadata
    message_type = db.Column(db.String(20), default='text') # 'text', 'attachment'
    is_read = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))

    # Relationships mapping
    sender = db.relationship('User', foreign_keys=[sender_id])
    receiver = db.relationship('User', foreign_keys=[receiver_id])
    appointment = db.relationship('Appointment', foreign_keys=[appointment_id])

    def to_dict(self):
        return {
            'id': self.id,
            'appointment_id': self.appointment_id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'content': self.content,
            'message_type': self.message_type,
            'is_read': self.is_read,
            'timestamp': self.created_at.isoformat() if self.created_at else None,
            'sender_name': self.sender.name if self.sender else ''
        }

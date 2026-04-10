"""
app/services/chat_service.py — Chat History & Management
"""

from app.models.message import Message

def get_chat_history(appointment_id: int):
    """Retrieve all messages for a specific appointment sorted by time."""
    messages = Message.query.filter_by(appointment_id=appointment_id)\
                            .order_by(Message.created_at.asc())\
                            .all()
    return [m.to_dict() for m in messages]

def mark_as_read(message_id: int):
    """Mark a specific message as read."""
    from app.extensions import db
    msg = Message.query.get(message_id)
    if msg:
        msg.is_read = True
        db.session.commit()
        return True
    return False

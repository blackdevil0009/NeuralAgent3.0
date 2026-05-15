"""
app/models/subscription.py — SQLAlchemy Subscription Model

Stores email addresses of users who have subscribed to the newsletter.
"""

from datetime import datetime, timezone
from app.extensions import db


class NewsletterSubscription(db.Model):
    __tablename__ = 'newsletter_subscriptions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f'<NewsletterSubscription {self.id} {self.email}>'

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'email': self.email,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

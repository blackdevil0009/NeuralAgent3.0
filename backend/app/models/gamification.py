"""
app/models/gamification.py — Gamification & Pop Coin Reward Models
"""

from datetime import datetime, timezone
from app.extensions import db


class PopCoinTransaction(db.Model):
    __tablename__ = 'pop_coin_transactions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    amount = db.Column(db.Integer, nullable=False) # Positive for earned, negative for redeemed
    transaction_type = db.Column(db.Enum('earned', 'redeemed', name='coin_transaction_type'), nullable=False)
    activity = db.Column(db.String(100), nullable=False) # e.g. 'diet_plan', 'quiz', 'referral', 'appointment'
    description = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'amount': self.amount,
            'type': self.transaction_type,
            'activity': self.activity,
            'description': self.description,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class UserStreak(db.Model):
    __tablename__ = 'user_streaks'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    activity_type = db.Column(db.String(50), nullable=False) # e.g., 'daily_login', 'diet_tracking'
    current_streak = db.Column(db.Integer, nullable=False, default=0)
    longest_streak = db.Column(db.Integer, nullable=False, default=0)
    
    last_activity_date = db.Column(db.Date, nullable=True) # Used to check consecutive days
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'activityType': self.activity_type,
            'currentStreak': self.current_streak,
            'longestStreak': self.longest_streak,
            'lastActivityDate': self.last_activity_date.isoformat() if self.last_activity_date else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

"""
app/models/ai_self_learning.py — AI Self-Learning Log Model
"""

from app.extensions import db
from datetime import datetime, timezone

class AISelfLearningLog(db.Model):
    __tablename__ = 'ai_self_learning_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    input_symptoms = db.Column(db.Text, nullable=False)
    predicted_treatment = db.Column(db.Text, nullable=False)
    actual_treatment = db.Column(db.Text, nullable=False)
    
    is_integrated = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f'<AISelfLearningLog id={self.id} integrated={self.is_integrated}>'

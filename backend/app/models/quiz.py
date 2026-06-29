"""
app/models/quiz.py — Gamified Quiz Module
"""

from datetime import datetime, timezone
import json
from app.extensions import db

class QuizLevel(db.Model):
    __tablename__ = 'quiz_levels'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False, unique=True) # Beginner, Intermediate, Advanced, Expert
    difficulty_rank = db.Column(db.Integer, nullable=False, unique=True) # 1, 2, 3, 4
    required_score_to_unlock = db.Column(db.Integer, nullable=False, default=0)
    reward_multiplier = db.Column(db.Float, nullable=False, default=1.0)
    description = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'difficultyRank': self.difficulty_rank,
            'requiredScoreToUnlock': self.required_score_to_unlock,
            'description': self.description
        }

class QuizCategory(db.Model):
    __tablename__ = 'quiz_categories'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(150), nullable=False, unique=True) # Morning Habits, Ayurveda Lifestyle, etc.
    description = db.Column(db.String(255), nullable=True)
    icon_url = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'iconUrl': self.icon_url,
            'isActive': self.is_active
        }

class QuizQuestion(db.Model):
    __tablename__ = 'quiz_questions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    category_id = db.Column(db.Integer, db.ForeignKey('quiz_categories.id', ondelete='CASCADE'), nullable=False, index=True)
    level_id = db.Column(db.Integer, db.ForeignKey('quiz_levels.id', ondelete='CASCADE'), nullable=False, index=True)
    
    question_type = db.Column(db.Enum('mcq', 'true_false', 'fill_blank', 'shlok_meaning', 'scenario', name='quiz_q_type'), nullable=False, default='mcq')
    question_text = db.Column(db.Text, nullable=False)
    options_json = db.Column(db.Text, nullable=False) # JSON array of options
    correct_answer = db.Column(db.String(255), nullable=False) # Needs to match exactly one of the options
    explanation = db.Column(db.Text, nullable=True) # To explain *why* it's the correct answer

    # Relationships
    category = db.relationship('QuizCategory', backref=db.backref('questions', lazy='dynamic'))
    level = db.relationship('QuizLevel', backref=db.backref('questions', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'categoryId': self.category_id,
            'levelId': self.level_id,
            'questionType': self.question_type,
            'questionText': self.question_text,
            'options': json.loads(self.options_json) if self.options_json else [],
            'explanation': self.explanation
        }

class UserQuizProgress(db.Model):
    __tablename__ = 'user_quiz_progress'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    
    current_level_id = db.Column(db.Integer, db.ForeignKey('quiz_levels.id', ondelete='SET NULL'), nullable=True)
    total_score = db.Column(db.Integer, nullable=False, default=0)
    quizzes_completed = db.Column(db.Integer, nullable=False, default=0)
    last_daily_quiz_date = db.Column(db.Date, nullable=True)
    
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    level = db.relationship('QuizLevel')
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'currentLevel': self.level.to_dict() if self.level else None,
            'totalScore': self.total_score,
            'quizzesCompleted': self.quizzes_completed,
            'lastDailyQuizDate': self.last_daily_quiz_date.isoformat() if self.last_daily_quiz_date else None
        }

class UserQuizHistory(db.Model):
    __tablename__ = 'user_quiz_history'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey('quiz_categories.id', ondelete='SET NULL'), nullable=True)
    level_id = db.Column(db.Integer, db.ForeignKey('quiz_levels.id', ondelete='SET NULL'), nullable=True)
    
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    coins_earned = db.Column(db.Integer, nullable=False, default=0)
    
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'categoryId': self.category_id,
            'levelId': self.level_id,
            'score': self.score,
            'totalQuestions': self.total_questions,
            'coinsEarned': self.coins_earned,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

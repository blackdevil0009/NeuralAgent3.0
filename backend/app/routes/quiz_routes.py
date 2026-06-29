"""
app/routes/quiz_routes.py — Endpoints for Gamified Quiz
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import random
import json

from app.extensions import db
from app.models.quiz import QuizLevel, QuizCategory, QuizQuestion, UserQuizProgress, UserQuizHistory
from app.models.user import User
from app.services.reward_service import award_coins

quiz_bp = Blueprint('quiz_bp', __name__)

@quiz_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    progress = UserQuizProgress.query.filter_by(user_id=user_id).first()
    if not progress:
        # Initialize progress for new users
        beginner = QuizLevel.query.filter_by(difficulty_rank=1).first()
        progress = UserQuizProgress(user_id=user_id, current_level_id=beginner.id if beginner else None)
        db.session.add(progress)
        db.session.commit()
        
    categories = QuizCategory.query.filter_by(is_active=True).all()
    levels = QuizLevel.query.order_by(QuizLevel.difficulty_rank).all()
    
    today = datetime.now(timezone.utc).date()
    daily_challenge_available = (progress.last_daily_quiz_date != today)
    
    unlocked_levels = []
    for lvl in levels:
        if progress.total_score >= lvl.required_score_to_unlock:
            unlocked_levels.append(lvl.to_dict())
            
    return jsonify({
        'progress': progress.to_dict(),
        'popCoinBalance': user.pop_coin_balance,
        'unlockedLevels': unlocked_levels,
        'categories': [c.to_dict() for c in categories],
        'dailyChallengeAvailable': daily_challenge_available
    }), 200

@quiz_bp.route('/start', methods=['GET'])
@jwt_required()
def start_quiz():
    category_id = request.args.get('category_id', type=int)
    level_id = request.args.get('level_id', type=int)
    limit = request.args.get('limit', default=5, type=int)
    
    if not category_id or not level_id:
        return jsonify({'error': 'category_id and level_id are required'}), 400
        
    questions = QuizQuestion.query.filter_by(category_id=category_id, level_id=level_id).all()
    
    if not questions:
        return jsonify({'error': 'No questions found for this category and level'}), 404
        
    # Pick random questions
    selected = random.sample(questions, min(len(questions), limit))
    
    # Hide correct answers and explanations for the payload
    quiz_data = []
    for q in selected:
        q_dict = q.to_dict()
        q_dict.pop('correct_answer', None) # Security: prevent cheating
        q_dict.pop('explanation', None)
        quiz_data.append(q_dict)
        
    return jsonify({
        'questions': quiz_data
    }), 200

@quiz_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_quiz():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    category_id = data.get('category_id')
    level_id = data.get('level_id')
    answers = data.get('answers') # list of dicts: [{'question_id': 1, 'answer': 'Vata'}]
    is_daily_challenge = data.get('is_daily_challenge', False)
    
    if not all([category_id, level_id, answers]):
        return jsonify({'error': 'Missing required fields (category_id, level_id, answers)'}), 400
        
    score = 0
    results = []
    
    level = QuizLevel.query.get(level_id)
    if not level:
        return jsonify({'error': 'Invalid level'}), 400
        
    for ans in answers:
        q_id = ans.get('question_id')
        user_ans = ans.get('answer', '')
        
        q = QuizQuestion.query.get(q_id)
        if q:
            # Simple case-insensitive string match
            is_correct = str(user_ans).strip().lower() == str(q.correct_answer).strip().lower()
            if is_correct:
                score += 1
                
            results.append({
                'question_id': q.id,
                'is_correct': is_correct,
                'correct_answer': q.correct_answer,
                'explanation': q.explanation
            })
            
    # Calculate rewards
    base_reward = score * 5 # 5 coins per correct answer
    total_reward = int(base_reward * level.reward_multiplier)
    
    # Update progress
    progress = UserQuizProgress.query.filter_by(user_id=user_id).first()
    if progress:
        progress.total_score += score
        progress.quizzes_completed += 1
        if is_daily_challenge:
            today = datetime.now(timezone.utc).date()
            if progress.last_daily_quiz_date != today:
                progress.last_daily_quiz_date = today
                total_reward += 50 # Daily bonus
                
        # Check if we should upgrade current_level_id
        levels = QuizLevel.query.order_by(QuizLevel.difficulty_rank.desc()).all()
        for lvl in levels:
            if progress.total_score >= lvl.required_score_to_unlock:
                progress.current_level_id = lvl.id
                break
                
    # Record history
    history = UserQuizHistory(
        user_id=user_id,
        category_id=category_id,
        level_id=level_id,
        score=score,
        total_questions=len(answers),
        coins_earned=total_reward
    )
    db.session.add(history)
    
    # Award coins via existing service
    if total_reward > 0:
        award_coins(user_id, total_reward, 'quiz', f'Completed quiz with score {score}/{len(answers)}')
        
    db.session.commit()
    
    return jsonify({
        'score': score,
        'total_questions': len(answers),
        'coins_earned': total_reward,
        'results': results,
        'new_total_score': progress.total_score if progress else 0
    }), 200

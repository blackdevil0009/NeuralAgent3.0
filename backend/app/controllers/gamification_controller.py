"""
app/controllers/gamification_controller.py
"""

from flask import request
from app.extensions import db
from app.models.user import User
from app.models.gamification import PopCoinTransaction, UserStreak
from app.middleware import get_jwt_user_id
from app.utils.response import success_response, error_response
from app.services import reward_service

import logging

logger = logging.getLogger(__name__)


def get_dashboard_data():
    """Returns gamification info for the current user."""
    user_id = get_jwt_user_id()
    user = User.query.get(user_id)
    if not user:
        return error_response("User not found", 404)

    # Fetch recent transactions
    txns = PopCoinTransaction.query.filter_by(user_id=user_id).order_by(PopCoinTransaction.created_at.desc()).limit(10).all()
    
    # Fetch active streaks
    streaks = UserStreak.query.filter_by(user_id=user_id).all()

    data = {
        'balance': user.pop_coin_balance,
        'level': user.achievement_level,
        'recent_transactions': [t.to_dict() for t in txns],
        'streaks': [s.to_dict() for s in streaks]
    }
    
    return success_response(data=data, message="Dashboard data fetched successfully")


def submit_daily_quiz():
    """User submits a daily quiz to earn coins."""
    user_id = get_jwt_user_id()
    data = request.get_json() or {}
    
    score = data.get('score', 0)
    total = data.get('total', 0)
    
    if total == 0:
        return error_response("Invalid quiz data", 400)
    
    percentage = score / total
    
    # Award coins based on score
    coins_earned = 10  # base for participation
    if percentage >= 0.8:
        coins_earned += 10 # bonus for good score
    if percentage == 1.0:
        coins_earned += 10 # perfect score bonus
        
    res = reward_service.award_coins(user_id, coins_earned, "health_quiz", f"Completed daily quiz with score {score}/{total}")
    
    if not res['success']:
        return error_response(res['message'], 500)
        
    return success_response(
        data={"coins_earned": coins_earned, "new_balance": res['new_balance'], "level_up": res['level_up']},
        message=f"Quiz submitted! You earned {coins_earned} Pop Coins."
    )


def claim_daily_login():
    """Called once a day by frontend to claim login streak."""
    user_id = get_jwt_user_id()
    
    res = reward_service.update_streak(user_id, "daily_login")
    
    coins_earned = 5 # base for daily login
    if res['bonus']:
        coins_earned += 50 # 7-day streak bonus
        
    award_res = reward_service.award_coins(user_id, coins_earned, "daily_login", "Daily login streak")
    
    return success_response(
        data={
            "streak": res['streak'], 
            "bonus_awarded": res['bonus'], 
            "coins_earned": coins_earned, 
            "new_balance": award_res.get('new_balance')
        },
        message=f"Daily streak: {res['streak']} days! Earned {coins_earned} coins."
    )

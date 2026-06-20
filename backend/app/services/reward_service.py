"""
app/services/reward_service.py — Gamification & Pop Coin Logic
"""

import logging
from datetime import datetime, timezone, timedelta
from app.extensions import db
from app.models.user import User
from app.models.gamification import PopCoinTransaction, UserStreak

logger = logging.getLogger(__name__)

LEVEL_THRESHOLDS = {
    0: 'Beginner',
    100: 'Wellness Explorer',
    500: 'Health Champion',
    1000: 'Fitness Master',
    2500: 'Elite Care Member'
}

def get_achievement_level(total_earned_coins: int) -> str:
    """Determine the user's achievement level based on their lifetime earned coins."""
    current_level = 'Beginner'
    for threshold, level_name in sorted(LEVEL_THRESHOLDS.items()):
        if total_earned_coins >= threshold:
            current_level = level_name
        else:
            break
    return current_level

def award_coins(user_id: int, amount: int, activity: str, description: str = None) -> dict:
    """
    Awards Pop Coins to a user and logs the transaction.
    Recalculates achievement level based on total earned coins.
    """
    if amount <= 0:
        return {"success": False, "message": "Amount must be positive."}

    user = User.query.get(user_id)
    if not user:
        return {"success": False, "message": "User not found."}

    # Update balance
    user.pop_coin_balance += amount

    # Log transaction
    txn = PopCoinTransaction(
        user_id=user_id,
        amount=amount,
        transaction_type='earned',
        activity=activity,
        description=description or f"Earned {amount} coins for {activity}"
    )
    db.session.add(txn)

    # Recalculate lifetime earned coins to update level
    # We sum all 'earned' transactions
    total_earned = db.session.query(db.func.sum(PopCoinTransaction.amount)).filter(
        PopCoinTransaction.user_id == user_id,
        PopCoinTransaction.transaction_type == 'earned'
    ).scalar() or 0
    
    total_earned += amount # Include the current transaction (not committed yet)
    
    new_level = get_achievement_level(total_earned)
    level_up = False
    if user.achievement_level != new_level:
        user.achievement_level = new_level
        level_up = True

    try:
        db.session.commit()
        return {
            "success": True,
            "message": "Coins awarded successfully",
            "new_balance": user.pop_coin_balance,
            "level_up": level_up,
            "new_level": user.achievement_level
        }
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to award coins: {e}")
        return {"success": False, "message": "Database error while awarding coins."}


def redeem_coins(user_id: int, amount: int, activity: str, description: str = None) -> dict:
    """
    Redeems Pop Coins from a user's balance.
    """
    if amount <= 0:
        return {"success": False, "message": "Amount must be positive."}

    user = User.query.get(user_id)
    if not user:
        return {"success": False, "message": "User not found."}

    if user.pop_coin_balance < amount:
        return {"success": False, "message": "Insufficient Pop Coin balance."}

    user.pop_coin_balance -= amount

    txn = PopCoinTransaction(
        user_id=user_id,
        amount=-amount,
        transaction_type='redeemed',
        activity=activity,
        description=description or f"Redeemed {amount} coins for {activity}"
    )
    db.session.add(txn)

    try:
        db.session.commit()
        return {
            "success": True,
            "message": "Coins redeemed successfully",
            "new_balance": user.pop_coin_balance
        }
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to redeem coins: {e}")
        return {"success": False, "message": "Database error while redeeming coins."}


def update_streak(user_id: int, activity_type: str) -> dict:
    """
    Updates the daily streak for a specific activity.
    If the streak hits a milestone (e.g. 7 days), returns bonus info.
    """
    today = datetime.now(timezone.utc).date()
    
    streak = UserStreak.query.filter_by(user_id=user_id, activity_type=activity_type).first()
    
    if not streak:
        streak = UserStreak(
            user_id=user_id, 
            activity_type=activity_type, 
            current_streak=1, 
            longest_streak=1,
            last_activity_date=today
        )
        db.session.add(streak)
        db.session.commit()
        return {"streak": 1, "bonus": False}

    if streak.last_activity_date == today:
        # Already done today, no changes
        return {"streak": streak.current_streak, "bonus": False}

    yesterday = today - timedelta(days=1)
    
    if streak.last_activity_date == yesterday:
        # Streak maintained
        streak.current_streak += 1
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
    else:
        # Streak broken
        streak.current_streak = 1

    streak.last_activity_date = today
    
    # Check for bonuses
    bonus = False
    if streak.current_streak > 0 and streak.current_streak % 7 == 0:
        bonus = True
        # Bonus is awarded by the controller after calling this
        
    db.session.commit()
    return {"streak": streak.current_streak, "bonus": bonus}

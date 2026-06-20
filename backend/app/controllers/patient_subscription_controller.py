from datetime import datetime, timezone, timedelta
from flask import request
from app.extensions import db
from app.models.patient_subscription import PatientSubscription
from app.models.user import User
from app.middleware import get_jwt_user_id
from app.utils.response import success_response, error_response
from app.services import payment_service
from app.services import reward_service
import logging

logger = logging.getLogger(__name__)

PLANS = {
    'Basic': {'price_inr': 149, 'duration_days': 30},
    'Standard': {'price_inr': 349, 'duration_days': 90},
    'Premium': {'price_inr': 649, 'duration_days': 180},
}

def create_subscription_order():
    user_id = get_jwt_user_id()
    data = request.get_json() or {}
    plan_name = data.get('planName')
    
    if plan_name not in PLANS:
        return error_response("Invalid plan selected.", 400)
        
    price_inr = PLANS[plan_name]['price_inr']
    
    try:
        # We reuse payment_service to create an order. 
        notes = {'type': 'subscription', 'plan': plan_name, 'user_id': user_id}
        order = payment_service.create_razorpay_order(price_inr, user_id, notes=notes)
        
        # Save pending subscription to DB
        sub = PatientSubscription(
            user_id=user_id,
            plan_name=plan_name,
            amount=price_inr * 100,
            status='pending',
            razorpay_order_id=order['id']
        )
        db.session.add(sub)
        db.session.commit()
        
        # Pass the public key ID to frontend so checkout script works
        from flask import current_app
        order['razorpay_key_id'] = current_app.config.get('RAZORPAY_KEY_ID', '')
        
        return success_response(data=order, message="Subscription order created.")
    except Exception as e:
        logger.error(f"Error creating subscription order: {e}")
        return error_response("Failed to create order.", 500)


def verify_subscription_payment():
    user_id = get_jwt_user_id()
    data = request.get_json() or {}
    
    razorpay_order_id = data.get('razorpay_order_id')
    razorpay_payment_id = data.get('razorpay_payment_id')
    razorpay_signature = data.get('razorpay_signature')
    
    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        return error_response("Missing payment details.", 400)
        
    # Verify signature
    is_valid = payment_service.verify_payment_signature(
        razorpay_order_id, razorpay_payment_id, razorpay_signature
    )
    
    if not is_valid:
        return error_response("Invalid payment signature.", 400)
        
    # Update Subscription
    sub = PatientSubscription.query.filter_by(razorpay_order_id=razorpay_order_id, user_id=user_id).first()
    if not sub:
        return error_response("Subscription record not found.", 404)
        
    if sub.status == 'active':
        return success_response(message="Subscription already active.")
        
    duration = PLANS.get(sub.plan_name, {}).get('duration_days', 30)
    sub.status = 'active'
    sub.razorpay_payment_id = razorpay_payment_id
    sub.start_date = datetime.now(timezone.utc)
    sub.end_date = sub.start_date + timedelta(days=duration)
    
    # --- REFERRAL & GAMIFICATION REWARD LOGIC ---
    user = User.query.get(user_id)

    # Award subscriber 50 Pop Coins for first-ever subscription purchase
    past_any_subs = PatientSubscription.query.filter(
        PatientSubscription.user_id == user_id,
        PatientSubscription.status == 'active',
        PatientSubscription.id != sub.id
    ).count()
    if past_any_subs == 0:
        reward_service.award_coins(
            user_id=user_id, amount=50, activity="subscription_purchase",
            description=f"Subscribed to {sub.plan_name} plan"
        )

    if user and user.referred_by_id:
        past_subs = PatientSubscription.query.filter(
            PatientSubscription.user_id == user_id, 
            PatientSubscription.status == 'active',
            PatientSubscription.id != sub.id
        ).count()
        
        if past_subs == 0:
            referrer = User.query.get(user.referred_by_id)
            if referrer:
                referrer.referrals_count += 1
                # Award referrer 100 Pop Coins for each successful referral
                reward_service.award_coins(
                    user_id=referrer.id, amount=100, activity="referral_success",
                    description=f"Successful referral: user #{user_id} subscribed"
                )
                # If they hit a multiple of 5, grant a Premium subscription reward
                if referrer.referrals_count % 5 == 0:
                    referrer.referral_rewards += 1
                    referrer_sub = PatientSubscription(
                        user_id=referrer.id,
                        plan_name='Premium Reward',
                        amount=0,
                        status='active',
                        start_date=datetime.now(timezone.utc),
                        end_date=datetime.now(timezone.utc) + timedelta(days=30),
                        razorpay_order_id=f"reward_{user_id}_{datetime.now().timestamp()}"
                    )
                    db.session.add(referrer_sub)
    
    db.session.commit()
    return success_response(message="Subscription activated successfully!")


def get_my_subscription():
    user_id = get_jwt_user_id()
    # Get highest active subscription
    sub = PatientSubscription.query.filter_by(user_id=user_id, status='active')\
        .order_by(PatientSubscription.end_date.desc()).first()
        
    if not sub:
        return success_response(data=None, message="No active subscription.")
        
    return success_response(data=sub.to_dict(), message="Active subscription fetched.")

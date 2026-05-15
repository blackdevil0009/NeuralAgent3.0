"""
app/routes/subscription_routes.py — Subscription endpoints
"""
from flask import Blueprint, request
from app.extensions import db
from app.models.subscription import NewsletterSubscription
from app.utils.response import success_response, error_response
from app.utils.email_utils import send_subscription_confirmation_email
import re

subscription_bp = Blueprint('subscription', __name__)

def is_valid_email(email: str) -> bool:
    pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(pattern, email) is not None

@subscription_bp.route('/subscribe', methods=['POST'])
def subscribe():
    """
    POST /api/subscribe
    Expects JSON: { "email": "user@example.com" }
    """
    data = request.get_json()
    if not data or 'email' not in data:
        return error_response('Email is required', 400)
        
    email = data.get('email', '').strip().lower()
    
    if not is_valid_email(email):
        return error_response('Invalid email format', 400)
        
    try:
        # Check if already subscribed
        existing_sub = NewsletterSubscription.query.filter_by(email=email).first()
        if existing_sub:
            if not existing_sub.is_active:
                existing_sub.is_active = True
                db.session.commit()
                # Optionally send email again, but we will skip to avoid spam
                return success_response(data=existing_sub.to_dict(), message='Subscription reactivated')
            return success_response(data=existing_sub.to_dict(), message='Already subscribed')
            
        # Create new subscription
        new_sub = NewsletterSubscription(email=email)
        db.session.add(new_sub)
        db.session.commit()
        
        # Send confirmation email
        send_subscription_confirmation_email(email)
        
        return success_response(data=new_sub.to_dict(), message='Successfully subscribed', status_code=201)
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'Failed to subscribe: {str(e)}', 500)

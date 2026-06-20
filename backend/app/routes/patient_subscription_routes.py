"""
app/routes/patient_subscription_routes.py — Routes for Patient Subscriptions (Pricing Plans)
"""

from flask import Blueprint
from app.controllers.patient_subscription_controller import (
    create_subscription_order,
    verify_subscription_payment,
    get_my_subscription
)
from app.middleware import jwt_required_custom

patient_subscription_bp = Blueprint('patient_subscription', __name__, url_prefix='/api/patient/subscriptions')

patient_subscription_bp.add_url_rule(
    '/create-order',
    view_func=jwt_required_custom(create_subscription_order),
    methods=['POST']
)

patient_subscription_bp.add_url_rule(
    '/verify',
    view_func=jwt_required_custom(verify_subscription_payment),
    methods=['POST']
)

patient_subscription_bp.add_url_rule(
    '/my',
    view_func=jwt_required_custom(get_my_subscription),
    methods=['GET']
)

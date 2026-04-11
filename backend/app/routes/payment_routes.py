"""
app/routes/payment_routes.py — Payment Blueprint

Routes:
  GET  /api/payments/history  → Patient / doctor / admin payment log (JWT)
  POST /api/payments/webhook  → Razorpay webhook (no JWT, HMAC verified)
"""

from flask import Blueprint
from app.middleware import jwt_required_custom
from app.controllers.payment_controller import (
    get_payment_history,
    razorpay_webhook,
)

payment_bp = Blueprint('payments', __name__, url_prefix='/api/payments')


@payment_bp.route('/history', methods=['GET'])
@jwt_required_custom
def payment_history():
    """Return transaction history for the authenticated user."""
    return get_payment_history()


@payment_bp.route('/webhook', methods=['POST'])
def webhook():
    """Razorpay webhook — no JWT (verified via HMAC signature)."""
    return razorpay_webhook()

"""
app/controllers/payment_controller.py — Payment History & Webhook Handler

Endpoints:
  GET  /api/payments/history  → Patient payment history (JWT)
  POST /api/payments/webhook  → Razorpay webhook (no auth, HMAC verified)
"""

import json
import logging

from flask import request

from app.extensions import db
from app.models.appointment import Appointment
from app.models.payment_transaction import PaymentTransaction
from app.middleware import get_jwt_user_id, get_jwt_claims
from app.utils import success_response, error_response
from app.services import payment_service

logger = logging.getLogger(__name__)


# ── Payment History (for patient dashboard) ───────────────────

def get_payment_history():
    """GET /api/payments/history — Patient's payment transaction log."""
    user_id = get_jwt_user_id()
    claims  = get_jwt_claims()
    role    = claims.get('role')

    if role == 'patient':
        txns = (
            PaymentTransaction.query
            .filter_by(user_id=user_id)
            .order_by(PaymentTransaction.created_at.desc())
            .all()
        )
    elif role == 'doctor':
        txns = (
            PaymentTransaction.query
            .filter_by(doctor_id=user_id)
            .order_by(PaymentTransaction.created_at.desc())
            .all()
        )
    elif role == 'admin':
        txns = (
            PaymentTransaction.query
            .order_by(PaymentTransaction.created_at.desc())
            .limit(500)
            .all()
        )
    else:
        return error_response("Unauthorized.", 403)

    return success_response(
        data={
            'transactions': [t.to_dict() for t in txns],
            'total':        len(txns),
        },
        message="Payment history retrieved."
    )


# ── Razorpay Webhook Handler ───────────────────────────────────

def razorpay_webhook():
    """
    POST /api/payments/webhook — Razorpay async event handler.

    Handles:
      - payment.captured   → mark appointment confirmed if still pending
      - payment.failed     → mark appointment failed
      - order.paid         → confirmation fallback
    """
    signature = request.headers.get('X-Razorpay-Signature', '')
    body_bytes = request.get_data()

    # Verify webhook authenticity
    if not payment_service.verify_webhook_signature(body_bytes, signature):
        logger.warning("⚠️  Razorpay webhook: invalid signature rejected.")
        return error_response("Invalid webhook signature.", 401)

    try:
        payload = json.loads(body_bytes)
    except json.JSONDecodeError:
        return error_response("Invalid JSON payload.", 400)

    event   = payload.get('event', '')
    entity  = payload.get('payload', {}).get('payment', {}).get('entity', {})

    logger.info(f"[WEBHOOK] Event: {event} | payment_id: {entity.get('id')}")

    # ── payment.captured ──────────────────────────────────────
    if event == 'payment.captured':
        _handle_payment_captured(entity)

    # ── payment.failed ────────────────────────────────────────
    elif event == 'payment.failed':
        _handle_payment_failed(entity)

    # ── order.paid ────────────────────────────────────────────
    elif event == 'order.paid':
        order_entity = payload.get('payload', {}).get('order', {}).get('entity', {})
        _handle_order_paid(order_entity, entity)

    return success_response(message="Webhook received.")


# ── Webhook Sub-handlers ──────────────────────────────────────

def _handle_payment_captured(entity: dict):
    """Mark appointment confirmed on payment.captured event."""
    order_id   = entity.get('order_id')
    payment_id = entity.get('id')
    amount     = entity.get('amount', 0)   # paise

    appointment = Appointment.query.filter_by(razorpay_order_id=order_id).first()
    if not appointment:
        logger.warning(f"[WEBHOOK] No appointment for order {order_id}")
        return

    if appointment.payment_status == 'paid':
        return   # already processed

    doctor_paise, platform_paise = payment_service.calculate_split(amount // 100)

    appointment.razorpay_payment_id = payment_id
    appointment.transaction_id      = payment_id
    appointment.payment_status      = 'paid'
    appointment.status              = 'confirmed'
    appointment.doctor_share        = doctor_paise
    appointment.platform_share      = platform_paise

    # Upsert transaction record
    txn = PaymentTransaction.query.filter_by(razorpay_order_id=order_id).first()
    if txn:
        txn.status              = 'captured'
        txn.razorpay_payment_id = payment_id
        txn.doctor_share        = doctor_paise
        txn.platform_share      = platform_paise
    else:
        txn = PaymentTransaction(
            appointment_id      = appointment.id,
            user_id             = appointment.user_id,
            doctor_id           = appointment.doctor_id,
            razorpay_order_id   = order_id,
            razorpay_payment_id = payment_id,
            amount              = amount,
            status              = 'captured',
            doctor_share        = doctor_paise,
            platform_share      = platform_paise,
        )
        db.session.add(txn)

    db.session.commit()
    logger.info(f"[WEBHOOK] ✅ payment.captured: appointment {appointment.id} confirmed.")


def _handle_payment_failed(entity: dict):
    """Mark appointment failed on payment.failed event."""
    order_id       = entity.get('order_id')
    payment_id     = entity.get('id')
    failure_reason = entity.get('error_description', 'Payment failed')

    appointment = Appointment.query.filter_by(razorpay_order_id=order_id).first()
    if not appointment:
        return

    if appointment.payment_status not in ('pending', 'failed'):
        return

    appointment.payment_status = 'failed'
    appointment.status         = 'cancelled'

    txn = PaymentTransaction.query.filter_by(razorpay_order_id=order_id).first()
    if txn:
        txn.status              = 'failed'
        txn.failure_reason      = failure_reason
        txn.razorpay_payment_id = payment_id

    db.session.commit()
    logger.info(f"[WEBHOOK] ❌ payment.failed: appointment {appointment.id} marked failed.")


def _handle_order_paid(order_entity: dict, payment_entity: dict):
    """Fallback for order.paid event."""
    order_id   = order_entity.get('id')
    payment_id = payment_entity.get('id')

    appointment = Appointment.query.filter_by(razorpay_order_id=order_id).first()
    if appointment and appointment.payment_status != 'paid':
        appointment.razorpay_payment_id = payment_id
        appointment.transaction_id      = payment_id
        appointment.payment_status      = 'paid'
        appointment.status              = 'confirmed'
        db.session.commit()
        logger.info(f"[WEBHOOK] order.paid fallback: appointment {appointment.id} confirmed.")

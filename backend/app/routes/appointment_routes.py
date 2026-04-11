"""
app/routes/appointment_routes.py — Appointment Blueprint (v2)

Routes:
  GET/POST  /api/appointments              → list or legacy (role-dispatched)
  GET       /api/appointments/user         → patient appointments
  GET       /api/appointments/doctor       → doctor appointments
  POST      /api/appointments/create-order → Step 1: create Razorpay order
  POST      /api/appointments/verify-payment → Step 2: verify & confirm
  GET       /api/appointments/<id>/receipt → Download PDF receipt
  PUT       /api/appointments/<id>/cancel  → Cancel appointment
"""

from flask import Blueprint, request
from app.middleware import jwt_required_custom, get_jwt_claims
from app.controllers.appointment_controller import (
    create_payment_order,
    verify_and_confirm,
    get_patient_appointments,
    get_doctor_appointments,
    get_appointment_receipt,
    cancel_appointment,
)

appointment_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')


# ── Legacy GET (role-dispatched) ──────────────────────────────
@appointment_bp.route('', methods=['GET'])
@jwt_required_custom
def list_appointments():
    claims = get_jwt_claims()
    if claims.get('role') == 'doctor':
        return get_doctor_appointments()
    return get_patient_appointments()


# ── Patient appointments ──────────────────────────────────────
@appointment_bp.route('/user', methods=['GET'])
@jwt_required_custom
def user_appointments():
    return get_patient_appointments()


# ── Doctor appointments ───────────────────────────────────────
@appointment_bp.route('/doctor', methods=['GET'])
@jwt_required_custom
def doctor_appointments():
    return get_doctor_appointments()


# ── STEP 1: Create Razorpay order ────────────────────────────
@appointment_bp.route('/create-order', methods=['POST'])
@jwt_required_custom
def create_order():
    """Validate slot & create Razorpay payment order (no booking yet)."""
    return create_payment_order()


# ── STEP 2: Verify payment & confirm booking ─────────────────
@appointment_bp.route('/verify-payment', methods=['POST'])
@jwt_required_custom
def verify_payment():
    """Verify Razorpay signature and confirm appointment."""
    return verify_and_confirm()


# ── PDF Receipt ───────────────────────────────────────────────
@appointment_bp.route('/<int:appointment_id>/receipt', methods=['GET'])
@jwt_required_custom
def download_receipt(appointment_id):
    """Download PDF receipt for a confirmed appointment."""
    return get_appointment_receipt(appointment_id)


# ── Cancel appointment ────────────────────────────────────────
@appointment_bp.route('/<int:appointment_id>/cancel', methods=['PUT'])
@jwt_required_custom
def cancel(appointment_id):
    """Cancel an appointment."""
    return cancel_appointment(appointment_id)

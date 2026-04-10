"""
app/controllers/appointment_controller.py — Appointment Logic
"""

import logging
from flask import request
from datetime import datetime
from app.extensions import db
from app.models.appointment import Appointment
from app.models.user import User
from app.middleware import get_jwt_user_id, get_jwt_claims
from app.utils import success_response, error_response, not_found_response, created_response

logger = logging.getLogger(__name__)

def book_appointment():
    """POST /api/appointments"""
    user_id = get_jwt_user_id()
    claims = get_jwt_claims()

    if claims.get('role') != 'patient':
        return error_response("Only patients can book appointments.", 403)

    body = request.get_json(force=True, silent=True) or {}
    
    # Accept both snake_case (legacy/internal) and camelCase (frontend)
    doctor_id = body.get('doctorId') or body.get('doctor_id')
    appointment_date = body.get('date') or body.get('appointment_date')
    appointment_time = body.get('time') or body.get('appointment_time')
    appointment_type = body.get('type') or body.get('appointment_type', 'Video Call')
    notes = body.get('notes', '')
    amount_paid = body.get('amountPaid') or body.get('amount_paid', 0)
    razorpay_payment_id = body.get('razorpayPaymentId') or body.get('razorpay_payment_id')
    razorpay_order_id = body.get('razorpayOrderId') or body.get('razorpay_order_id')

    if not doctor_id or not appointment_date or not appointment_time:
        return error_response("doctor_id, appointment_date, and appointment_time are required.", 400)

    # Verify doctor exists
    doctor = User.query.filter_by(id=doctor_id, role='doctor').first()
    if not doctor:
        return not_found_response("Doctor not found.")

    try:
        # Expected formats: YYYY-MM-DD and HH:MM AM/PM or HH:MM
        app_date = datetime.strptime(appointment_date, '%Y-%m-%d').date()
        
        # Handle "HH:MM AM/PM" format from frontend
        try:
            app_time = datetime.strptime(appointment_time, '%I:%M %p').time()
        except ValueError:
            app_time = datetime.strptime(appointment_time, '%H:%M').time()
            
    except ValueError as e:
        return error_response(f"Invalid date/time format. {str(e)}", 400)

    # ── SLOT COLLISION CHECK ──
    existing = Appointment.query.filter_by(
        doctor_id=doctor_id,
        appointment_date=app_date,
        appointment_time=app_time
    ).filter(Appointment.status != 'cancelled').first()

    if existing:
        return error_response("This doctor is already booked for this specific time slot. Please choose another time.", 400)

    appointment = Appointment(
        user_id=user_id,
        doctor_id=doctor_id,
        appointment_date=app_date,
        appointment_time=app_time,
        appointment_type=appointment_type,
        notes=notes,
        amount_paid=amount_paid,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_order_id=razorpay_order_id,
        status='booked'
    )
    
    db.session.add(appointment)
    db.session.commit()
    logger.info(f"Appointment created: patient_id={user_id}, doctor_id={doctor_id}")

    return created_response(
        data=appointment.to_dict(),
        message="Appointment booked successfully."
    )


def get_patient_appointments():
    """GET /api/appointments/user"""
    user_id = get_jwt_user_id()
    claims = get_jwt_claims()

    if claims.get('role') != 'patient':
        return error_response("Only patients can view patient appointments.", 403)

    appointments = Appointment.query.filter_by(user_id=user_id).all()
    return success_response(
        data={'appointments': [a.to_dict() for a in appointments]},
        message="Patient appointments retrieved."
    )


def get_doctor_appointments():
    """GET /api/appointments/doctor"""
    user_id = get_jwt_user_id()
    claims = get_jwt_claims()

    if claims.get('role') != 'doctor':
        return error_response("Only doctors can view doctor appointments.", 403)

    appointments = Appointment.query.filter_by(doctor_id=user_id).all()
    return success_response(
        data={'appointments': [a.to_dict() for a in appointments]},
        message="Doctor appointments retrieved."
    )

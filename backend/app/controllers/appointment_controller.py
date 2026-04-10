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
    doctor_id = body.get('doctor_id')
    appointment_date = body.get('appointment_date')
    appointment_time = body.get('appointment_time')

    if not doctor_id or not appointment_date or not appointment_time:
        return error_response("doctor_id, appointment_date, and appointment_time are required.", 400)

    # Verify doctor exists
    doctor = User.query.filter_by(id=doctor_id, role='doctor').first()
    if not doctor:
        return not_found_response("Doctor not found.")

    try:
        app_date = datetime.strptime(appointment_date, '%Y-%m-%d').date()
        app_time = datetime.strptime(appointment_time, '%H:%M').time()
    except ValueError:
        return error_response("Invalid date/time format. Use YYYY-MM-DD for date and HH:MM for time.", 400)

    appointment = Appointment(
        user_id=user_id,
        doctor_id=doctor_id,
        appointment_date=app_date,
        appointment_time=app_time,
        status='pending'
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

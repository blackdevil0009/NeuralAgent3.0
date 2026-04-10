"""
app/routes/appointment_routes.py — Appointment Blueprint
"""

from flask import Blueprint
from app.controllers.appointment_controller import (
    book_appointment,
    get_patient_appointments,
    get_doctor_appointments
)
from flask import request
from app.middleware import jwt_required_custom, get_jwt_claims

appointment_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')

@appointment_bp.route('', methods=['GET', 'POST'])
@jwt_required_custom
def book():
    if request.method == 'GET':
        claims = get_jwt_claims()
        if claims.get('role') == 'doctor':
            return get_doctor_appointments()
        return get_patient_appointments()
    return book_appointment()

@appointment_bp.route('/user', methods=['GET'])
@jwt_required_custom
def user_appointments():
    return get_patient_appointments()

@appointment_bp.route('/doctor', methods=['GET'])
@jwt_required_custom
def doctor_appointments():
    return get_doctor_appointments()

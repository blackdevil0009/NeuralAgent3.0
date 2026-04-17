"""
app/controllers/hospital_emergency_controller.py - Hospital Emergency Case Management
"""

import logging
from datetime import datetime, timezone

from flask import request
from flask_jwt_extended import get_jwt_identity

from app.extensions import db, socketio
from app.models.emergency import Emergency
from app.models.user import User
from app.utils.response import (
    success_response,
    error_response,
    not_found_response,
    forbidden_response,
)

logger = logging.getLogger(__name__)


def get_hospital_id(user_id: int) -> int:
    """Get hospital_id for the current organization admin."""
    user = User.query.get(user_id)
    if not user or user.role != 'organization':
        return None
    return user.id


def get_all_emergencies():
    """GET /api/hospital/emergencies"""
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return error_response('Invalid user', 401)

    user = User.query.get(user_id)
    if not user or user.role != 'organization':
        return forbidden_response('Only hospital admins can access emergencies.')

    emergencies = (
        Emergency.query
        .filter(Emergency.hospital_id == user.id)
        .order_by(Emergency.created_at.desc())
        .all()
    )
    return success_response(data={'emergencies': [_format_emergency(e) for e in emergencies]})


def get_emergency_by_id(emergency_id: int):
    """GET /api/hospital/emergencies/<id>"""
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return error_response('Invalid user', 401)

    user = User.query.get(user_id)
    if not user or user.role != 'organization':
        return forbidden_response('Only hospital admins can access emergencies.')

    emergency = Emergency.query.get(emergency_id)
    if not emergency:
        return not_found_response('Emergency case not found.')
    if emergency.hospital_id != user.id:
        return forbidden_response('This emergency does not belong to your hospital queue.')

    return success_response(data=_format_emergency(emergency))


def assign_doctor_to_emergency(emergency_id: int):
    """POST /api/hospital/emergencies/<id>/assign"""
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return error_response('Invalid user', 401)

    user = User.query.get(user_id)
    if not user or user.role != 'organization':
        return forbidden_response('Only hospital admins can assign doctors.')

    emergency = Emergency.query.get(emergency_id)
    if not emergency:
        return not_found_response('Emergency case not found.')
    if emergency.hospital_id != user.id:
        return forbidden_response('This emergency does not belong to your hospital queue.')

    data = request.get_json(force=True, silent=True) or {}
    doctor_id = data.get('doctorId')
    if not doctor_id:
        return error_response('Doctor ID is required.', 400)

    doctor = User.query.get(doctor_id)
    if not doctor or doctor.role != 'doctor':
        return error_response('Doctor not found.', 404)
    if doctor.hospital_id != user.id:
        return forbidden_response('Doctor not part of this hospital.')

    emergency.doctor_id = doctor_id
    emergency.status = 'claimed'
    emergency.assigned_at = datetime.now(timezone.utc)

    try:
        db.session.commit()
        socketio.emit('new_emergency', emergency.to_dict())
        logger.info("Emergency %s assigned to doctor %s", emergency_id, doctor_id)
        return success_response(
            data=_format_emergency(emergency),
            message=f'Emergency assigned to {doctor.name}.'
        )
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to assign emergency: %s", exc)
        return error_response('Failed to assign doctor.', 500)


def resolve_emergency(emergency_id: int):
    """PUT /api/hospital/emergencies/<id>/resolve"""
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return error_response('Invalid user', 401)

    user = User.query.get(user_id)
    if not user or user.role != 'organization':
        return forbidden_response('Only hospital admins can resolve emergencies.')

    emergency = Emergency.query.get(emergency_id)
    if not emergency:
        return not_found_response('Emergency case not found.')
    if emergency.hospital_id != user.id:
        return forbidden_response('This emergency does not belong to your hospital queue.')

    emergency.status = 'resolved'
    emergency.resolved_at = datetime.now(timezone.utc)

    try:
        db.session.commit()
        socketio.emit('emergency_handled', {'id': emergency.id})
        logger.info("Emergency %s marked as resolved", emergency_id)
        return success_response(
            data=_format_emergency(emergency),
            message='Emergency marked as resolved.'
        )
    except Exception as exc:
        db.session.rollback()
        logger.error("Failed to resolve emergency: %s", exc)
        return error_response('Failed to resolve emergency.', 500)


def get_hospital_doctors():
    """GET /api/hospital/doctors"""
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return error_response('Invalid user', 401)

    user = User.query.get(user_id)
    if not user or user.role != 'organization':
        return forbidden_response('Only hospital admins can access this.')

    doctors = User.query.filter_by(hospital_id=user.id, role='doctor').all()
    data = [{
        'id': doc.id,
        'name': doc.name,
        'specialization': doc.specialization or 'General Medicine',
        'experience': doc.experience,
        'regNumber': doc.reg_number,
        'isVerified': doc.verification_status == 'verified',
        'activeEmergencyCount': Emergency.query.filter(
            Emergency.doctor_id == doc.id,
            Emergency.status != 'resolved',
        ).count(),
    } for doc in doctors]
    return success_response(data={'doctors': data})


def _format_emergency(emergency: Emergency) -> dict:
    hospital_name = emergency.hospital.hospital if emergency.hospital and emergency.hospital.hospital else (
        emergency.hospital.name if emergency.hospital else ''
    )
    return {
        'id': emergency.id,
        'patientId': emergency.patient_id,
        'patientName': emergency.patient_name or (emergency.patient.name if emergency.patient else 'Unknown'),
        'doctorId': emergency.doctor_id,
        'hospitalId': emergency.hospital_id,
        'hospitalName': hospital_name,
        'assignedDoctorName': emergency.doctor.name if emergency.doctor else None,
        'explanation': emergency.explanation,
        'caseType': emergency.case_type,
        'contact': emergency.contact,
        'contactName': emergency.contact_name or '',
        'location': emergency.location or '',
        'providerType': emergency.provider_type or 'hospital',
        'providerName': emergency.provider_name or '',
        'status': emergency.status,
        'createdAt': emergency.created_at.isoformat() if emergency.created_at else None,
        'assignedAt': emergency.assigned_at.isoformat() if emergency.assigned_at else None,
        'resolvedAt': emergency.resolved_at.isoformat() if emergency.resolved_at else None,
    }

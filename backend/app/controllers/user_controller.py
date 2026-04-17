"""
app/controllers/user_controller.py - User Profile Business Logic
"""

import logging
from datetime import datetime, timezone

from flask import request
from marshmallow import ValidationError

from app.extensions import db
from app.models.emergency import Emergency
from app.models.user import User
from app.middleware import get_jwt_user_id
from app.utils import (
    success_response,
    error_response,
    not_found_response,
    send_upi_confirmation_email,
)
from app.utils.validators import (
    PatientProfileSchema,
    DoctorProfileSchema,
    OrganizationProfileSchema,
)

logger = logging.getLogger(__name__)

_patient_schema = PatientProfileSchema()
_doctor_schema = DoctorProfileSchema()
_org_schema = OrganizationProfileSchema()

_PROTECTED = {
    'id', 'email', 'password_hash', 'role', 'is_active',
    'is_email_verified', 'verification_status', 'payout_verified',
    'two_fa_secret', 'created_at',
}

_PATIENT_FIELDS = {
    'name', 'mobile', 'address', 'city', 'state', 'pincode', 'profile_image',
    'blood_group', 'dosha', 'allergies', 'conditions', 'medications',
}
_DOCTOR_FIELDS = {
    'name', 'mobile', 'address', 'city', 'state', 'pincode', 'profile_image',
    'degree', 'position', 'specialization', 'experience',
    'hospital', 'clinic_location', 'reg_number',
    'consultant_fee', 'working_hours',
    'upi_id', 'bank_account_name', 'bank_account_number', 'bank_ifsc',
}
_ORG_FIELDS = {
    'admin_name', 'mobile', 'address', 'city', 'state', 'pincode',
    'hospital', 'hospital_type', 'reg_number',
}

_FIELD_MAP = {
    'clinicLocation': 'clinic_location',
    'regNumber': 'reg_number',
    'consultantFee': 'consultant_fee',
    'workingHours': 'working_hours',
    'upiId': 'upi_id',
    'bankAccountName': 'bank_account_name',
    'bankAccountNumber': 'bank_account_number',
    'bankIfsc': 'bank_ifsc',
    'adminName': 'admin_name',
    'hospitalName': 'hospital',
    'hospitalType': 'hospital_type',
    'pin': 'pincode',
    'bloodGroup': 'blood_group',
}


def _remap(data: dict) -> dict:
    result = {}
    for key, value in data.items():
        result[_FIELD_MAP.get(key, key)] = value
    return result


def _build_recent_cases(cases: list[Emergency]) -> list[dict]:
    return [case.to_dict() for case in cases]


def _doctor_emergency_summary(user: User) -> tuple[dict, list[dict]]:
    recent_cases = (
        Emergency.query
        .filter_by(doctor_id=user.id)
        .order_by(Emergency.created_at.desc())
        .limit(5)
        .all()
    )
    all_cases = Emergency.query.filter_by(doctor_id=user.id).all()
    summary = {
        'totalAssigned': len(all_cases),
        'activeCases': sum(1 for case in all_cases if case.status != 'resolved'),
        'resolvedCases': sum(1 for case in all_cases if case.status == 'resolved'),
        'criticalCases': sum(1 for case in all_cases if case.case_type == 'critical'),
    }
    return summary, _build_recent_cases(recent_cases)


def _organization_emergency_summary(user: User) -> tuple[dict, list[dict]]:
    recent_cases = (
        Emergency.query
        .filter_by(hospital_id=user.id)
        .order_by(Emergency.created_at.desc())
        .limit(5)
        .all()
    )
    all_cases = Emergency.query.filter_by(hospital_id=user.id).all()
    summary = {
        'totalCases': len(all_cases),
        'pendingCases': sum(1 for case in all_cases if case.status == 'pending'),
        'claimedCases': sum(1 for case in all_cases if case.status == 'claimed'),
        'resolvedCases': sum(1 for case in all_cases if case.status == 'resolved'),
        'criticalCases': sum(1 for case in all_cases if case.case_type == 'critical'),
        'urgentCases': sum(1 for case in all_cases if case.case_type == 'urgent'),
        'registeredDoctors': User.query.filter_by(hospital_id=user.id, role='doctor').count(),
    }
    return summary, _build_recent_cases(recent_cases)


def get_profile():
    """GET /api/user/profile"""
    user_id = get_jwt_user_id()
    if not user_id:
        from app.utils import unauthorized_response
        return unauthorized_response()

    user = User.query.get(int(user_id))
    if not user:
        return not_found_response('User profile not found.')

    data = user.to_dict(include_sensitive=True)
    if user.role == 'doctor':
        summary, recent_cases = _doctor_emergency_summary(user)
        data['emergencySummary'] = summary
        data['recentEmergencyCases'] = recent_cases
    elif user.role == 'organization':
        summary, recent_cases = _organization_emergency_summary(user)
        data['emergencySummary'] = summary
        data['recentEmergencyCases'] = recent_cases

    return success_response(data=data, message='Profile fetched successfully.')


def update_profile():
    """PUT /api/user/profile"""
    user_id = get_jwt_user_id()
    if not user_id:
        from app.utils import unauthorized_response
        return unauthorized_response()

    user = User.query.get(int(user_id))
    if not user:
        return not_found_response('User not found.')

    raw = request.get_json(force=True, silent=True) or {}
    logger.warning("Profile update payload [user_id=%s]: %s", user_id, raw)

    try:
        if user.role == 'doctor':
            validated = _doctor_schema.load(raw, partial=True)
        elif user.role == 'organization':
            validated = _org_schema.load(raw, partial=True)
        else:
            validated = _patient_schema.load(raw, partial=True)
    except ValidationError as err:
        logger.warning("Validation failed for user_id=%s: %s", user_id, err.messages)
        return error_response(
            'Validation failed',
            422,
            {'message': 'One or more fields are invalid.', 'details': err.messages},
        )

    remapped = _remap(validated)
    if user.role == 'doctor':
        allowed = _DOCTOR_FIELDS
    elif user.role == 'organization':
        allowed = _ORG_FIELDS
    else:
        allowed = _PATIENT_FIELDS

    clean = {
        key: value for key, value in remapped.items()
        if key in allowed and key not in _PROTECTED
    }

    if not clean:
        return error_response('No updatable fields provided.', 400)

    if user.role == 'doctor' and 'upi_id' in clean:
        new_upi = (clean['upi_id'] or '').strip()
        if new_upi and new_upi != (user.upi_id or ''):
            send_upi_confirmation_email(user.email, user.name or 'Doctor', new_upi)
            clean['payout_verified'] = False
            clean['upi_verify_requested'] = False

    for column, value in clean.items():
        if hasattr(user, column):
            setattr(user, column, value)

    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    data = user.to_dict(include_sensitive=True)
    if user.role == 'doctor':
        summary, recent_cases = _doctor_emergency_summary(user)
        data['emergencySummary'] = summary
        data['recentEmergencyCases'] = recent_cases
    elif user.role == 'organization':
        summary, recent_cases = _organization_emergency_summary(user)
        data['emergencySummary'] = summary
        data['recentEmergencyCases'] = recent_cases

    logger.info("Profile updated: user_id=%s, role=%s", user_id, user.role)
    return success_response(data=data, message='Profile updated successfully.')

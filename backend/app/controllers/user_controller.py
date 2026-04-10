"""
app/controllers/user_controller.py — User Profile Business Logic (MySQL Edition)
"""

import logging
from datetime import datetime, timezone

from flask import current_app, request
from marshmallow import ValidationError

from app.extensions import db
from app.models.user import User
from app.middleware  import get_jwt_user_id, get_jwt_claims
from app.utils       import (success_response, error_response,
                              not_found_response, send_upi_confirmation_email)
from app.utils.validators import PatientProfileSchema, DoctorProfileSchema

logger = logging.getLogger(__name__)

_patient_schema = PatientProfileSchema()
_doctor_schema  = DoctorProfileSchema()

# ── Fields the client is NEVER allowed to update ──────────────────
_PROTECTED = {
    'id', 'email', 'password_hash', 'role', 'is_active',
    'is_email_verified', 'verification_status', 'payout_verified',
    'two_fa_secret', 'created_at',
}

# ── Allowed update fields per role ────────────────────────────────
_PATIENT_FIELDS = {
    'name', 'mobile', 'address', 'city', 'state', 'pincode', 'profile_image',
}
_DOCTOR_FIELDS  = {
    'name', 'mobile', 'address', 'city', 'state', 'pincode', 'profile_image',
    'degree', 'position', 'specialization', 'experience',
    'hospital', 'clinic_location', 'reg_number',
    'consultant_fee', 'working_hours',
    'upi_id', 'bank_account_name', 'bank_account_number', 'bank_ifsc',
}

# ── Frontend key → DB column name map (for doctor camelCase keys) ─
_FIELD_MAP = {
    'clinicLocation':    'clinic_location',
    'regNumber':         'reg_number',
    'consultantFee':     'consultant_fee',
    'workingHours':      'working_hours',
    'upiId':             'upi_id',
    'bankAccountName':   'bank_account_name',
    'bankAccountNumber': 'bank_account_number',
    'bankIfsc':          'bank_ifsc',
    'pin':               'pincode',     # alias
}


def _remap(data: dict) -> dict:
    """Translate camelCase frontend keys to snake_case model columns."""
    result = {}
    for k, v in data.items():
        col = _FIELD_MAP.get(k, k)
        result[col] = v
    return result


def get_profile():
    """GET /api/user/profile"""
    user_id = get_jwt_user_id()
    if not user_id:
        from app.utils import unauthorized_response
        return unauthorized_response()

    user = User.query.get(int(user_id))
    if not user:
        return not_found_response('User profile not found.')

    return success_response(data=user.to_dict(), message='Profile fetched successfully.')


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

    # ── Validate ──────────────────────────────────────────────────
    try:
        if user.role == 'doctor':
            validated = _doctor_schema.load(raw, partial=True)
        else:
            validated = _patient_schema.load(raw, partial=True)
    except ValidationError as err:
        return error_response('Validation failed', 422, err.messages)

    # ── Translate keys & filter to allowed set ────────────────────
    remapped = _remap(validated)
    allowed  = _DOCTOR_FIELDS if user.role == 'doctor' else _PATIENT_FIELDS
    clean    = {k: v for k, v in remapped.items()
                if k in allowed and k not in _PROTECTED}

    if not clean:
        return error_response('No updatable fields provided.', 400)

    # ── UPI change: notify + reset verification ───────────────────
    if user.role == 'doctor' and 'upi_id' in clean:
        new_upi = (clean['upi_id'] or '').strip()
        if new_upi and new_upi != (user.upi_id or ''):
            send_upi_confirmation_email(user.email, user.name or 'Doctor', new_upi)
            clean['payout_verified']      = False
            clean['upi_verify_requested'] = False

    # ── Apply to model ────────────────────────────────────────────
    for col, val in clean.items():
        if hasattr(user, col):
            setattr(user, col, val)

    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    logger.info(f"Profile updated: user_id={user_id}, role={user.role}")
    return success_response(data=user.to_dict(), message='Profile updated successfully.')

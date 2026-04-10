"""
app/controllers/doctor_controller.py — Doctor-Specific Logic (MySQL Edition)
"""

import re
import logging
import requests as http_requests

from flask import current_app, request

from app.extensions import db
from app.models.user import User
from app.middleware  import get_jwt_user_id, get_jwt_claims
from app.utils       import (success_response, error_response,
                              not_found_response, forbidden_response)

logger  = logging.getLogger(__name__)
IFSC_RE = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$', re.IGNORECASE)
UPI_RE  = re.compile(r'^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$')


def verify_upi():
    """POST /api/doctor/verify-upi — request UPI payout verification."""
    claims  = get_jwt_claims()
    user_id = get_jwt_user_id()

    if claims.get('role') != 'doctor':
        return forbidden_response('Only doctors can request UPI verification.')

    body   = request.get_json(force=True, silent=True) or {}
    upi_id = (body.get('upiId') or '').strip()

    if not upi_id:
        return error_response('UPI ID is required.', 400)
    if not UPI_RE.match(upi_id):
        return error_response('Invalid UPI ID format (e.g. yourname@ybl).', 400)

    user = User.query.get(int(user_id))
    if not user:
        return not_found_response('Doctor account not found.')

    user.upi_id               = upi_id
    user.payout_verified      = False
    user.upi_verify_requested = True
    db.session.commit()

    logger.info(f"UPI verification requested: user_id={user_id}, upiId={upi_id}")
    return success_response(
        message=(
            'UPI verification request submitted. '
            'A test payout of ₹1 will be sent to your UPI account for confirmation.'
        )
    )


def get_ifsc_info(code: str):
    """GET /api/utils/ifsc/<code> — proxy Razorpay IFSC lookup."""
    code = code.strip().upper()
    if not IFSC_RE.match(code):
        return error_response('Invalid IFSC format (e.g. HDFC0001234).', 400)

    try:
        resp = http_requests.get(
            f'https://ifsc.razorpay.com/{code}',
            timeout=5,
            headers={'Accept': 'application/json'},
        )
        if resp.status_code == 404:
            return error_response('IFSC code not found.', 404)
        if not resp.ok:
            return error_response('IFSC lookup failed. Try again.', 502)

        d = resp.json()
        return success_response(data={
            'bank':   d.get('BANK'),
            'branch': d.get('BRANCH'),
            'city':   d.get('CITY'),
            'state':  d.get('STATE'),
            'ifsc':   d.get('IFSC'),
            'micr':   d.get('MICR'),
        }, message='IFSC info fetched.')

    except http_requests.exceptions.Timeout:
        return error_response('IFSC lookup timed out. Please try again.', 504)
    except Exception as exc:
        logger.error(f'IFSC lookup error for {code}: {exc}')
        return error_response('IFSC lookup failed.', 500)


def get_doctors():
    """GET /api/doctors — List all doctors with optional filters."""
    # Query builder
    query = User.query.filter_by(role='doctor', is_active=True)

    # Filtering
    specialization = request.args.get('specialization') or request.args.get('spec')
    if specialization:
        query = query.filter(User.specialization.ilike(f'%{specialization}%'))

    location = request.args.get('location') or request.args.get('city')
    if location:
        # Check both city and specialized clinic location
        query = query.filter(
            (User.city.ilike(f'%{location}%')) | 
            (User.clinic_location.ilike(f'%{location}%'))
        )

    experience = request.args.get('experience')
    if experience:
        try:
            # Assumes experience is stored as a number string or similar
            exp_val = int(experience)
            query = query.filter(db.cast(User.experience, db.Integer) >= exp_val)
        except ValueError:
            pass
            
    doctors = query.all()
    
    return success_response(
        data={'doctors': [d.to_dict(include_sensitive=False) for d in doctors]},
        message='Doctors retrieved successfully.'
    )

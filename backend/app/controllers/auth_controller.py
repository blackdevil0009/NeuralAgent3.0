"""
app/controllers/auth_controller.py — Authentication Business Logic (MySQL Edition)

All DB operations use SQLAlchemy ORM via Flask-SQLAlchemy.
"""

import os
import logging
import bcrypt
import random
import string
from datetime import datetime, timezone, timedelta

from flask import current_app, request
from flask_jwt_extended import create_access_token, create_refresh_token
from marshmallow import ValidationError
import jwt
from sqlalchemy.exc import IntegrityError

from app.middleware import get_jwt_user_id

from app.extensions import db
from app.models.user          import User
from app.models.otp           import Otp
from app.models.password_reset import PasswordReset
from app.models.hospital_invitation import HospitalInvitation
from app.utils       import (generate_otp, generate_token,
                              send_otp_email, send_welcome_email,
                              send_password_reset_email,
                              success_response, error_response, created_response,
                              not_found_response)
from app.utils.validators import (PatientRegisterSchema, DoctorRegisterSchema,
                                   OrganizationRegisterSchema,
                                   LoginSchema, OtpSchema, ForgotPasswordSchema,
                                   ResetPasswordSchema)
from app.services.document_verification_service import get_verification_service

logger = logging.getLogger(__name__)

# ── Schema singletons ─────────────────────────────────────────────
_patient_schema = PatientRegisterSchema()
_doctor_schema  = DoctorRegisterSchema()
_org_schema     = OrganizationRegisterSchema()
_login_schema   = LoginSchema()
_otp_schema     = OtpSchema()
_forgot_schema  = ForgotPasswordSchema()
_reset_schema   = ResetPasswordSchema()


# ═══════════════════════════════════════════════════════════════
#  Private helpers
# ═══════════════════════════════════════════════════════════════

def _hash_password(plain: str) -> str:
    rounds = current_app.config.get('BCRYPT_LOG_ROUNDS', 12)
    return bcrypt.hashpw(
        plain.encode('utf-8'),
        bcrypt.gensalt(rounds)
    ).decode('utf-8')


def _check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


def _make_jwt(user_id: int, role: str) -> dict:
    """Return access + refresh token dict."""
    claims        = {'role': role}
    access_token  = create_access_token(identity=str(user_id),
                                        additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user_id),
                                         additional_claims=claims)
    return {'token': access_token, 'refresh_token': refresh_token}


def _allowed_file(filename: str) -> bool:
    allowed = current_app.config.get('ALLOWED_EXTENSIONS', {'pdf','jpg','jpeg','png'})
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed


def _save_upload(file) -> str:
    """Save document file and return stored filename."""
    import uuid
    from werkzeug.utils import secure_filename
    upload_dir = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_dir, exist_ok=True)
    ext      = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(upload_dir, filename))
    return filename


def _save_otp(email: str, otp_code: str, purpose: str):
    """Upsert an OTP record for email + purpose."""
    ttl     = current_app.config.get('OTP_EXPIRY_MINUTES', 10)
    expires = datetime.now(timezone.utc) + timedelta(minutes=ttl)
    # Delete any existing OTP for this email + purpose
    Otp.query.filter_by(email=email.lower(), purpose=purpose).delete()
    record = Otp(
        email=email.lower(),
        otp=otp_code,
        purpose=purpose,
        expires_at=expires,
    )
    db.session.add(record)
    db.session.commit()


def _verify_otp(email: str, otp_code: str, purpose: str) -> bool:
    """Return True and delete the record if OTP is valid and not expired."""
    now    = datetime.now(timezone.utc)
    record = Otp.query.filter_by(
        email=email.lower(), otp=otp_code, purpose=purpose
    ).first()
    if not record:
        return False
    exp = record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        db.session.delete(record)
        db.session.commit()
        return False
    db.session.delete(record)
    db.session.commit()
    return True


def _otp_in_cooldown(email: str, purpose: str) -> bool:
    """True if an OTP was created within the cooldown window."""
    cooldown = current_app.config.get('OTP_RESEND_COOLDOWN', 60)
    cutoff   = datetime.now(timezone.utc) - timedelta(seconds=cooldown)
    return Otp.query.filter(
        Otp.email    == email.lower(),
        Otp.purpose  == purpose,
        Otp.created_at > cutoff,
    ).count() > 0


# ═══════════════════════════════════════════════════════════════
#  REGISTER
# ═══════════════════════════════════════════════════════════════

def register_patient(data: dict):
    """Create a patient account and send OTP."""
    if User.query.filter_by(email=data['email']).first():
        return error_response('An account with this email already exists.', 409)

    # Resolve referrer if referralCode provided
    referred_by_id = None
    if data.get('referralCode'):
        referrer = User.query.filter_by(referral_code=data['referralCode'].strip().upper()).first()
        if referrer:
            referred_by_id = referrer.id

    # Generate unique referral code
    new_referral_code = 'VMX-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    # Simple deduplication attempt
    while User.query.filter_by(referral_code=new_referral_code).first():
        new_referral_code = 'VMX-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    user = User(
        email             = data['email'],
        password_hash     = _hash_password(data['password']),
        role              = 'patient',
        name              = data.get('fullName', '').strip(),
        mobile            = data.get('mobile', '').strip(),
        dob               = data.get('dob'),
        gender            = data.get('gender'),
        address           = data.get('address', '').strip(),
        city              = data.get('city', '').strip(),
        state             = data.get('state', '').strip(),
        pincode           = data.get('pincode', '').strip(),
        terms_agreed      = bool(data.get('termsAgreed', False)),
        is_email_verified = False,
        referral_code     = new_referral_code,
        referred_by_id    = referred_by_id,
    )
    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response('An account with this email already exists.', 409)

    otp = generate_otp()
    _save_otp(data['email'], otp, 'registration')
    send_otp_email(data['email'], user.name or 'User', otp, 'registration')

    logger.info(f"Patient registered: {data['email']} (id={user.id})")
    return created_response(
        data={'email': data['email']},
        message='Registration successful! Please check your email for the verification code.'
    )


def register_doctor(data: dict, file, invite_token: str = ''):
    """Create a doctor account with document upload and send OTP."""
    # 1. Verify the AI Document Verification Token
    token = data.get('verificationToken')
    if not token:
        return error_response('Document verification token is missing. Please verify your document first.', 400)
    
    try:
        decoded = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        if decoded.get('purpose') != 'document_verification':
            return error_response('Invalid verification token purpose.', 400)
    except jwt.ExpiredSignatureError:
        return error_response('Verification token expired. Please verify your document again.', 400)
    except jwt.InvalidTokenError:
        return error_response('Invalid verification token.', 400)

    if User.query.filter_by(email=data['email']).first():
        return error_response('An account with this email already exists.', 409)

    if not file or not _allowed_file(file.filename):
        return error_response(
            'A valid document (PDF/JPG/PNG, max 5 MB) is required.', 422
        )

    doc_path = _save_upload(file)

    user = User(
        email               = data['email'],
        password_hash       = _hash_password(data['password']),
        role                = 'doctor',
        name                = data.get('fullName', '').strip(),
        mobile              = data.get('mobile', '').strip(),
        dob                 = data.get('dob') or None,
        address             = data.get('address', '').strip(),
        city                = data.get('city', '').strip(),
        state               = data.get('state', '').strip(),
        pincode             = data.get('pincode', '').strip(),
        degree              = data.get('degree', ''),
        position            = data.get('position', ''),
        specialization      = data.get('specialization', ''),
        experience          = str(data.get('experience', '0')),
        hospital            = data.get('hospital', '').strip(),
        clinic_location     = data.get('clinicLocation', '').strip(),
        reg_number          = data.get('regNumber', '').strip(),
        document_path       = doc_path,
        consultant_fee      = 0,
        working_hours       = 'Mon-Fri, 10AM-6PM',
        verification_status = 'pending',
        terms_agreed        = bool(data.get('termsAgreed', False)),
        is_email_verified   = False,
    )
    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response('An account with this email already exists.', 409)

    invite_token = (invite_token or '').strip()
    if invite_token:
        invite = HospitalInvitation.query.filter_by(
            token=invite_token,
            doctor_email=user.email.lower()
        ).first()
        if invite and invite.status in ('pending', 'registered'):
            exp = invite.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < exp:
                invite.status = 'registered'
                invite.invited_doctor_id = user.id
                db.session.commit()

    otp  = generate_otp()
    name = f"Dr. {user.name}" if user.name else 'Doctor'
    _save_otp(data['email'], otp, 'registration')
    send_otp_email(data['email'], name, otp, 'registration')

    logger.info(f"Doctor registered: {data['email']} (id={user.id})")
    return created_response(
        data={'email': data['email']},
        message='Registration successful! Please check your email for the verification code.'
    )


def register_organization(data: dict, file):
    """Create an organization account and send OTP."""
    if User.query.filter_by(email=data['email']).first():
        return error_response('An account with this email already exists.', 409)

    doc_path = _save_upload(file) if file and _allowed_file(file.filename) else None

    user = User(
        email             = data['email'],
        password_hash     = _hash_password(data['password']),
        role              = 'organization',
        name              = data.get('hospitalName', '').strip(),
        admin_name        = data.get('adminName', '').strip(),
        mobile            = data.get('mobile', '').strip(),
        address           = data.get('address', '').strip(),
        city              = (data.get('city') or '').strip(),
        state             = (data.get('state') or '').strip(),
        pincode           = (data.get('pincode') or '').strip(),
        reg_number        = data.get('regNumber', '').strip(),
        hospital          = data.get('hospitalName', '').strip(),
        hospital_type     = data.get('hospitalType', '').strip() or None,
        document_path     = doc_path,
        terms_agreed      = str(data.get('termsAgreed', 'false')).lower() in ('true', '1', 'yes'),
        is_email_verified = False,
        is_verified       = True,
    )
    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response('An account with this email already exists.', 409)

    otp  = generate_otp()
    _save_otp(data['email'], otp, 'registration')
    send_otp_email(data['email'], user.name, otp, 'registration')

    logger.info(f"Organization registered: {data['email']} (id={user.id})")
    return created_response(
        data={'email': data['email']},
        message='Registration successful! Please check your official email for the verification code.'
    )


def register():
    """POST /api/auth/register — dispatch by role/content-type."""
    content_type = request.content_type or ''

    if 'multipart/form-data' in content_type:
        # Dispatch by role (both Doctor and Organization send multipart)
        form_data = request.form.to_dict()
        invite_token = form_data.get('inviteToken', '')
        role = form_data.get('role', 'doctor')

        if role == 'organization':
            try:
                data = _org_schema.load(form_data)
            except ValidationError as err:
                return error_response('Validation failed', 422, err.messages)
            return register_organization(data, request.files.get('document'))

        # Default: Doctor registration
        try:
            data = _doctor_schema.load(form_data)
        except ValidationError as err:
            return error_response('Validation failed', 422, err.messages)
        return register_doctor(data, request.files.get('document'), invite_token=invite_token)

    # JSON body
    body = request.get_json(force=True, silent=True) or {}
    invite_token = body.get('inviteToken', '')
    role = body.get('role', 'patient')

    if role == 'organization':
        try:
            data = _org_schema.load(body)
        except ValidationError as err:
            return error_response('Validation failed', 422, err.messages)
        return register_organization(data, request.files.get('document'))

    if role == 'doctor':
        try:
            data = _doctor_schema.load(body)
        except ValidationError as err:
            return error_response('Validation failed', 422, err.messages)
        return register_doctor(data, request.files.get('document'), invite_token=invite_token)

    # Patient
    try:
        data = _patient_schema.load(body)
    except ValidationError as err:
        return error_response('Validation failed', 422, err.messages)
    return register_patient(data)


# ═══════════════════════════════════════════════════════════════
#  LOGIN
# ═══════════════════════════════════════════════════════════════

def login():
    """POST /api/auth/login"""
    try:
        data = _login_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response('Validation failed', 422, err.messages)

    # 1. Env-based Admin Login Override
    admin_email = current_app.config.get('ADMIN_EMAIL', 'admin@vaidyamedx.in')
    admin_key   = current_app.config.get('ADMIN_LOGIN_KEY')
    
    if admin_key and data.get('email') == admin_email and data.get('password') == admin_key:
        admin_user = User.query.filter_by(email=admin_email, role='admin').first()
        admin_id = admin_user.id if admin_user else 0
        tokens = _make_jwt(admin_id, 'admin')
        user_dict = admin_user.to_dict() if admin_user else {
            'id': admin_id,
            'email': admin_email,
            'name': 'System Administrator',
            'role': 'admin',
            'is_active': True,
            'is_email_verified': True
        }
        return success_response(
            data={**tokens, 'role': 'admin', 'user': user_dict},
            message='Admin login successful.'
        )

    user = User.query.filter_by(email=data['email']).first()
    if not user or not _check_password(data['password'], user.password_hash):
        return error_response('Invalid email or password.', 401)

    # Role mismatch check
    requested = data.get('role', 'patient')
    if user.role != requested and user.role != 'admin':
        label = requested.capitalize()
        return error_response(
            f'No {label} account found with this email. '
            f'Please select the correct login tab.', 403
        )

    # Email not verified
    if not user.is_email_verified:
        otp = generate_otp()
        _save_otp(user.email, otp, 'registration')
        send_otp_email(user.email, user.name or 'User', otp, 'registration')
        return error_response(
            'Your email is not verified. We sent a new code to your email.', 403
        )

    # Account inactive
    if not user.is_active:
        return error_response(
            'Your account has been deactivated. Please contact support.', 403
        )

    # 2FA enabled
    if user.two_fa_enabled:
        otp = generate_otp()
        _save_otp(user.email, otp, '2fa')
        send_otp_email(user.email, user.name or 'User', otp, '2fa')
        return success_response(
            data={'status': '2fa_required', 'email': user.email},
            message='2FA code sent to your email.'
        )

    # Success — issue tokens
    tokens = _make_jwt(user.id, user.role)
    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    return success_response(
        data={**tokens, 'role': user.role, 'user': user.to_dict()},
        message='Login successful.'
    )


# ═══════════════════════════════════════════════════════════════
#  OTP VERIFICATION
# ═══════════════════════════════════════════════════════════════

def verify_registration_otp():
    """POST /api/auth/verify-registration-otp"""
    try:
        data = _otp_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response('Validation failed', 422, err.messages)

    if not _verify_otp(data['email'], data['otp'], 'registration'):
        return error_response('Invalid or expired verification code.', 400)

    user = User.query.filter_by(email=data['email']).first()
    if not user:
        return not_found_response('User not found.')

    user.is_email_verified = True
    invite_accepted = None

    if user.role == 'doctor':
        invite = (
            HospitalInvitation.query.filter(
                HospitalInvitation.doctor_email == user.email.lower(),
                HospitalInvitation.status.in_(('pending', 'registered')),
            )
            .order_by(HospitalInvitation.created_at.desc())
            .first()
        )
        if invite:
            exp = invite.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < exp:
                if user.hospital_id in (None, invite.hospital_id):
                    user.hospital_id = invite.hospital_id
                    user.is_verified = True
                    if user.verification_status == 'pending':
                        user.verification_status = 'verified'
                    invite.status = 'accepted'
                    invite.invited_doctor_id = user.id
                    invite.accepted_doctor_id = user.id
                    invite.accepted_at = datetime.now(timezone.utc)
                    invite_accepted = invite
            elif invite.status in ('pending', 'registered'):
                invite.status = 'expired'

    if invite_accepted:
        if user.two_fa_enabled:
            otp = generate_otp()
            _save_otp(user.email, otp, '2fa')
            send_otp_email(user.email, user.name or 'Doctor', otp, '2fa')
            db.session.commit()
            send_welcome_email(user.email, user.name or 'User', user.role)
            return success_response(
                data={'status': '2fa_required', 'email': user.email, 'inviteAccepted': True},
                message='Email verified and hospital invitation accepted. 2FA code sent.',
            )

        tokens = _make_jwt(user.id, user.role)
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()
        send_welcome_email(user.email, user.name or 'User', user.role)
        return success_response(
            data={**tokens, 'role': user.role, 'user': user.to_dict(), 'inviteAccepted': True},
            message='Email verified and hospital invitation accepted.',
        )

    db.session.commit()
    send_welcome_email(user.email, user.name or 'User', user.role)
    return success_response(message='Email verified successfully! You can now log in.')


def verify_2fa_otp():
    """POST /api/auth/verify-2fa-otp"""
    try:
        data = _otp_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response('Validation failed', 422, err.messages)

    if not _verify_otp(data['email'], data['otp'], '2fa'):
        return error_response('Invalid or expired 2FA code.', 400)

    user = User.query.filter_by(email=data['email']).first()
    if not user:
        return not_found_response('User not found.')

    tokens           = _make_jwt(user.id, user.role)
    user.last_login  = datetime.now(timezone.utc)
    db.session.commit()

    return success_response(
        data={**tokens, 'role': user.role, 'user': user.to_dict()},
        message='2FA verified. Login successful.'
    )


# ═══════════════════════════════════════════════════════════════
#  RESEND OTP
# ═══════════════════════════════════════════════════════════════

def _resend_otp(purpose: str, ok_msg: str):
    """Shared resend logic — always responds with success to prevent enumeration."""
    try:
        body = _forgot_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response('Validation failed', 422, err.messages)

    email = body['email']
    user  = User.query.filter_by(email=email).first()

    if user:
        if _otp_in_cooldown(email, purpose):
            cd = current_app.config.get('OTP_RESEND_COOLDOWN', 60)
            return error_response(
                f'Please wait {cd} seconds before requesting a new code.', 429
            )
        otp = generate_otp()
        _save_otp(email, otp, purpose)
        send_otp_email(email, user.name or 'User', otp, purpose)

    return success_response(message=ok_msg)


def resend_verification():
    """POST /api/auth/resend-verification"""
    return _resend_otp('registration',
                       'A new verification code has been sent to your email.')


def resend_2fa_otp():
    """POST /api/auth/resend-2fa-otp"""
    return _resend_otp('2fa', 'A new 2FA code has been sent to your email.')


# ═══════════════════════════════════════════════════════════════
#  EMAIL VERIFICATION (token link)
# ═══════════════════════════════════════════════════════════════

def verify_email_token():
    """GET /api/auth/verify-email?token=<token>"""
    token = request.args.get('token', '').strip()
    if not token:
        return error_response('Verification token is missing.', 400)

    record = PasswordReset.query.filter_by(
        token=token, purpose='email_verify', used=False
    ).first()

    if not record or not record.is_valid:
        return error_response(
            'This verification link is invalid or has expired.', 400
        )

    user = User.query.filter_by(email=record.email).first()
    if not user:
        return not_found_response('User not found.')

    record.used = True
    if user.is_email_verified:
        db.session.commit()
        return success_response(message='Email already verified. Please log in.')

    user.is_email_verified = True
    db.session.commit()

    send_welcome_email(user.email, user.name or 'User', user.role)
    return success_response(message='Email verified successfully! You can now log in.')


# ═══════════════════════════════════════════════════════════════
#  FORGOT / RESET PASSWORD
# ═══════════════════════════════════════════════════════════════

def forgot_password():
    """POST /api/forgot-password"""
    try:
        data = _forgot_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response('Validation failed', 422, err.messages)

    user = User.query.filter_by(email=data['email']).first()
    if user:
        token  = generate_token(48)
        exp    = datetime.now(timezone.utc) + timedelta(minutes=30)
        # Invalidate previous reset tokens for this email
        PasswordReset.query.filter_by(
            email=user.email, purpose='reset', used=False
        ).update({'used': True})
        db.session.add(PasswordReset(
            email=user.email, token=token,
            purpose='reset', expires_at=exp
        ))
        db.session.commit()
        login_path = '/hospital/login' if user.role == 'organization' else '/login'
        send_password_reset_email(
            user.email,
            user.name or 'User',
            token,
            login_path=login_path,
        )
        logger.info(f"Password reset requested: {user.email}")

    return success_response(
        message='If an account exists for that email, a reset link has been sent.'
    )


def reset_password():
    """POST /api/reset-password"""
    try:
        data = _reset_schema.load(request.get_json(force=True, silent=True) or {})
    except ValidationError as err:
        return error_response('Validation failed', 422, err.messages)

    record = PasswordReset.query.filter_by(
        token=data['token'], purpose='reset', used=False
    ).first()

    if not record or not record.is_valid:
        return error_response('This reset link is invalid or has expired.', 400)

    user = User.query.filter_by(email=record.email).first()
    if not user:
        return not_found_response('User not found.')

    user.password_hash = _hash_password(data['password'])
    record.used        = True
    db.session.commit()

    logger.info(f"Password reset successful: {record.email}")
    return success_response(message='Password reset successfully. You can now log in.')


# ═══════════════════════════════════════════════════════════════
#  2FA SETTINGS
# ═══════════════════════════════════════════════════════════════

def toggle_2fa():
    """POST /api/auth/2fa/toggle"""
    user_id = get_jwt_user_id()
    user = User.query.get(int(user_id))
    
    if not user:
        return not_found_response('User not found.')

    data = request.get_json(force=True, silent=True) or {}
    password = data.get('password', '')
    if not password or not _check_password(password, user.password_hash):
        return error_response('Invalid password.', 401)

    # Toggle the flag
    user.is_2fa_enabled = not user.is_2fa_enabled
    db.session.commit()
    state = "enabled" if user.is_2fa_enabled else "disabled"
    return success_response(message=f"Two-factor authentication has been {state}.")

# ═══════════════════════════════════════════════════════════════
#  AI Document Verification
# ═══════════════════════════════════════════════════════════════

def verify_document_ocr():
    """Verify uploaded doctor credentials using AI OCR."""
    if 'document' not in request.files:
        return error_response('No document file uploaded.', 400)
    
    file = request.files['document']
    if not file or not file.filename:
        return error_response('No selected file.', 400)

    # Need name and degree; regNumber is optional — OCR will extract and auto-fill it
    expected_name = request.form.get('fullName', '')
    expected_degree = request.form.get('degree', '')
    expected_reg_number = request.form.get('regNumber', '')  # Optional — cross-checked if provided
    expected_dob = request.form.get('dob', '')  # Optional — verified if provided

    if not expected_name or not expected_degree:
        return error_response('Missing required fields (fullName, degree) for verification.', 400)

    # Read bytes and MIME type
    image_bytes = file.read()
    file.seek(0) # Reset pointer so it can be saved later if needed
    mime_type = file.content_type or 'image/jpeg'

    ai_service = get_verification_service()
    result = ai_service.verify_document(
        image_bytes=image_bytes,
        mime_type=mime_type,
        expected_name=expected_name,
        expected_degree=expected_degree,
        expected_reg_number=expected_reg_number,
        expected_dob=expected_dob
    )

    if not result.get('is_valid', False):
        return error_response(result.get('reason', 'Document verification failed.'), 400, errors=result.get('extracted'))

    # If valid, generate a short-lived token (15 mins) to authorize the final registration
    token_payload = {
        'purpose': 'document_verification',
        'expected_name': expected_name,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=15)
    }
    token = jwt.encode(token_payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

    # Return the extracted DOB so the frontend can auto-fill the form field
    extracted = result.get('extracted', {})
    return success_response(message='Document verified successfully!', data={
        'verification_token': token,
        'extracted': extracted,
        'extracted_dob': extracted.get('dob')  # frontend can auto-fill DOB
    })

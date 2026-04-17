"""
app/controllers/hospital_mgmt_controller.py - Hospital admin doctor invitation logic
"""

from datetime import datetime, timezone, timedelta
import logging

from flask import current_app, request
from flask_jwt_extended import create_access_token, create_refresh_token

from app.extensions import db
from app.models.user import User
from app.models.hospital_invitation import HospitalInvitation
from app.middleware import get_jwt_user_id, get_jwt_claims
from app.utils import (
    success_response,
    error_response,
    not_found_response,
    forbidden_response,
    generate_otp,
    generate_token,
    send_otp_email,
    send_hospital_invitation_email,
)

logger = logging.getLogger(__name__)


def _issue_doctor_tokens(user: User) -> dict:
    claims = {"role": user.role}
    access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=claims)
    return {"token": access_token, "refresh_token": refresh_token}


def _invitation_valid(invite: HospitalInvitation) -> bool:
    if not invite:
        return False
    if invite.status not in ("pending", "registered"):
        return False
    exp = invite.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) < exp


def _doctor_is_hospital_admin_claims() -> tuple[dict, int]:
    claims = get_jwt_claims()
    hospital_id = get_jwt_user_id()
    try:
        hospital_id = int(hospital_id)
    except Exception:
        return claims, 0
    return claims, hospital_id


def add_doctor():
    """POST /api/v2/hospital/doctor/add - Send doctor invitation link."""
    claims, hospital_id = _doctor_is_hospital_admin_claims()
    if claims.get("role") != "organization":
        return forbidden_response("Only organization admins can invite doctors.")
    if not hospital_id:
        return error_response("Invalid hospital identity.", 401)

    hospital = User.query.get(hospital_id)
    if not hospital or hospital.role != "organization":
        return forbidden_response("Only valid hospital accounts can send invitations.")

    body = request.get_json(force=True, silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    name = (body.get("name") or "").strip()

    if not email:
        return error_response("Doctor email is required.", 400)

    existing_doctor = User.query.filter_by(email=email, role="doctor").first()
    if existing_doctor and existing_doctor.hospital_id == hospital_id:
        return error_response("This doctor is already part of your hospital.", 400)

    now = datetime.now(timezone.utc)
    existing_invite = (
        HospitalInvitation.query.filter_by(
            hospital_id=hospital_id,
            doctor_email=email,
            status="pending",
        )
        .order_by(HospitalInvitation.created_at.desc())
        .first()
    )
    if existing_invite and _invitation_valid(existing_invite):
        return error_response(
            "A pending invitation already exists for this doctor. Please wait for expiry or acceptance.",
            409,
        )

    token = generate_token(64)
    expiry_hours = current_app.config.get("DOCTOR_INVITE_EXPIRY_HOURS", 48)
    invite = HospitalInvitation(
        hospital_id=hospital_id,
        doctor_email=email,
        doctor_name=name or (existing_doctor.name if existing_doctor else ""),
        token=token,
        status="pending",
        invited_doctor_id=existing_doctor.id if existing_doctor else None,
        expires_at=now + timedelta(hours=expiry_hours),
    )
    db.session.add(invite)
    db.session.commit()

    frontend_url = current_app.config.get("FRONTEND_URL", "").rstrip("/")
    invite_url = f"{frontend_url}/doctor/invite?token={token}"

    try:
        send_hospital_invitation_email(
            to=email,
            doctor_name=invite.doctor_name or "Doctor",
            hospital_name=hospital.hospital or hospital.name or "Hospital",
            invite_url=invite_url,
            is_registered=bool(existing_doctor),
        )
        logger.info("Hospital %s invited doctor %s", hospital_id, email)
    except Exception as exc:
        logger.error("Failed to send hospital invite email to %s: %s", email, exc)

    return success_response(
        data={
            "inviteToken": token,
            "inviteUrl": invite_url,
            "email": email,
            "isRegisteredDoctor": bool(existing_doctor),
        },
        message="Doctor invitation link sent successfully.",
    )


def get_invite_status():
    """GET /api/v2/doctor/invite/status?token=... - validate invitation token."""
    token = (request.args.get("token") or "").strip()
    if not token:
        return error_response("Invitation token is required.", 400)

    invite = HospitalInvitation.query.filter_by(token=token).first()
    if not invite:
        return not_found_response("Invitation not found.")

    if not _invitation_valid(invite):
        if invite.status in ("pending", "registered"):
            invite.status = "expired"
            db.session.commit()
        return error_response("Invitation link is invalid or expired.", 400)

    hospital = User.query.get(invite.hospital_id)
    doctor = User.query.filter_by(email=invite.doctor_email, role="doctor").first()
    doctor_attached = bool(doctor and doctor.hospital_id == invite.hospital_id)

    return success_response(
        data={
            "token": token,
            "email": invite.doctor_email,
            "doctorName": invite.doctor_name or (doctor.name if doctor else ""),
            "hospitalName": (
                (hospital.hospital or hospital.name) if hospital else "Hospital"
            ),
            "isRegisteredDoctor": bool(doctor),
            "isEmailVerified": bool(doctor and doctor.is_email_verified),
            "isAlreadyAttached": doctor_attached,
            "requiresRegistration": not bool(doctor),
            "expiresAt": invite.expires_at.isoformat() if invite.expires_at else None,
        },
        message="Invitation status fetched.",
    )


def accept_invitation():
    """POST /api/v2/doctor/invite/accept - accept invitation and sign doctor in."""
    body = request.get_json(force=True, silent=True) or {}
    token = (body.get("token") or "").strip()
    if not token:
        return error_response("Invitation token is required.", 400)

    invite = HospitalInvitation.query.filter_by(token=token).first()
    if not invite:
        return not_found_response("Invitation not found.")

    if not _invitation_valid(invite):
        if invite.status in ("pending", "registered"):
            invite.status = "expired"
            db.session.commit()
        return error_response("Invitation link is invalid or expired.", 400)

    doctor = User.query.filter_by(email=invite.doctor_email, role="doctor").first()
    if not doctor:
        return error_response(
            "Doctor account not found. Please complete doctor registration first.",
            404,
        )

    if not doctor.is_email_verified:
        invite.status = "registered"
        invite.invited_doctor_id = doctor.id
        db.session.commit()
        return error_response(
            "Please verify your doctor account first, then accept this invitation.",
            403,
        )

    if doctor.hospital_id and doctor.hospital_id != invite.hospital_id:
        return error_response(
            "This doctor is already linked to another hospital. Contact support to transfer.",
            409,
        )

    doctor.hospital_id = invite.hospital_id
    doctor.is_verified = True
    if doctor.verification_status == "pending":
        doctor.verification_status = "verified"

    invite.status = "accepted"
    invite.invited_doctor_id = doctor.id
    invite.accepted_doctor_id = doctor.id
    invite.accepted_at = datetime.now(timezone.utc)

    if doctor.two_fa_enabled:
        otp = generate_otp()
        from app.models.otp import Otp

        Otp.query.filter_by(email=doctor.email.lower(), purpose="2fa").delete()
        ttl = current_app.config.get("OTP_EXPIRY_MINUTES", 10)
        exp = datetime.now(timezone.utc) + timedelta(minutes=ttl)
        db.session.add(
            Otp(
                email=doctor.email.lower(),
                otp=otp,
                purpose="2fa",
                expires_at=exp,
            )
        )
        db.session.commit()
        send_otp_email(doctor.email, doctor.name or "Doctor", otp, "2fa")
        return success_response(
            data={"status": "2fa_required", "email": doctor.email},
            message="Invitation accepted. 2FA code sent to your email.",
        )

    tokens = _issue_doctor_tokens(doctor)
    doctor.last_login = datetime.now(timezone.utc)
    db.session.commit()

    return success_response(
        data={**tokens, "role": doctor.role, "user": doctor.to_dict()},
        message="Invitation accepted and doctor account signed in.",
    )


def reject_invitation():
    """POST /api/v2/doctor/invite/reject - reject invitation token."""
    body = request.get_json(force=True, silent=True) or {}
    token = (body.get("token") or "").strip()
    if not token:
        return error_response("Invitation token is required.", 400)

    invite = HospitalInvitation.query.filter_by(token=token).first()
    if not invite:
        return not_found_response("Invitation not found.")

    if invite.status == "accepted":
        return error_response("This invitation is already accepted and cannot be rejected.", 409)

    if invite.status in ("revoked", "expired"):
        return success_response(message="Invitation already closed.")

    invite.status = "revoked"
    db.session.commit()
    return success_response(message="Invitation rejected successfully.")


def remove_doctor():
    """DELETE /api/v2/hospital/doctor/remove - unlink doctor from current hospital."""
    claims, hospital_id = _doctor_is_hospital_admin_claims()
    if claims.get("role") != "organization":
        return forbidden_response("Only organization admins can remove doctors.")
    if not hospital_id:
        return error_response("Invalid hospital identity.", 401)

    body = request.get_json(force=True, silent=True) or {}
    doctor_email = (body.get("email") or "").strip().lower()

    if not doctor_email:
        return error_response("Doctor email is required.", 400)

    doctor = User.query.filter_by(
        email=doctor_email,
        hospital_id=hospital_id,
        role="doctor",
    ).first()
    if not doctor:
        return not_found_response("Doctor not found in your hospital records.")

    doctor.hospital_id = None
    db.session.commit()
    return success_response(message=f"Doctor {doctor_email} removed from your hospital.")


def list_hospital_doctors():
    """GET /api/v2/hospital/doctors - list doctors attached to logged-in hospital."""
    claims, hospital_id = _doctor_is_hospital_admin_claims()
    if claims.get("role") != "organization":
        return forbidden_response("Only organization admins can view this list.")
    if not hospital_id:
        return error_response("Invalid hospital identity.", 401)

    doctors = User.query.filter_by(hospital_id=hospital_id, role="doctor").all()
    return success_response(
        data={"doctors": [doctor.to_dict(include_sensitive=True) for doctor in doctors]},
        message="Hospital doctors retrieved.",
    )


def verify_doctor_flow():
    """Legacy endpoint retained for compatibility."""
    return error_response(
        "This endpoint is deprecated. Use the invitation link flow instead.",
        410,
    )

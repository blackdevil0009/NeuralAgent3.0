"""
app/controllers/appointment_controller.py — Appointment Logic (v2 — Payment-Gated)

3-Step Booking Flow:
  1. POST /api/appointments/create-order  → validate slot, create Razorpay order, save pending appointment
  2. POST /api/appointments/verify-payment → verify sig, confirm, record txn, initiate transfer
  3. GET  /api/appointments/             → list with gated doctor details
  4. GET  /api/appointments/<id>/receipt → stream PDF receipt
  5. PUT  /api/appointments/<id>/cancel  → cancel appointment
"""

import logging
from datetime import datetime
from flask import request, send_file, current_app
import io

from app.extensions import db, socketio
from app.models.appointment import Appointment
from app.models.user import User
from app.models.payment_transaction import PaymentTransaction
from app.middleware import get_jwt_user_id, get_jwt_claims
from app.utils import success_response, error_response, not_found_response, created_response
from app.services import payment_service
from app.services import pdf_service
from app.services import reward_service

logger = logging.getLogger(__name__)


def _emit_appointment_event(event_name: str, appointment: Appointment):
    payload = appointment.to_dict(include_sensitive=True)
    doctor = User.query.get(appointment.doctor_id) if appointment.doctor_id else None
    hospital_id = doctor.hospital_id if doctor else None

    socketio.emit(event_name, payload, room=f"user_{appointment.user_id}")
    socketio.emit(event_name, payload, room=f"user_{appointment.doctor_id}")
    if hospital_id:
        socketio.emit(event_name, payload, room=f"hospital_{hospital_id}")


# ═══════════════════════════════════════════════════════════════
#  STEP 1 — Create Razorpay Order (pre-payment)
# ═══════════════════════════════════════════════════════════════

def create_payment_order():
    """
    POST /api/appointments/create-order

    Validates the slot, creates a Razorpay order, saves an appointment
    in 'pending' status. Does NOT confirm booking yet.
    """
    user_id = get_jwt_user_id()
    claims  = get_jwt_claims()

    if claims.get('role') != 'patient':
        return error_response("Only patients can book appointments.", 403)

    body = request.get_json(force=True, silent=True) or {}

    doctor_id        = body.get('doctorId') or body.get('doctor_id')
    appointment_date = body.get('date')     or body.get('appointment_date')
    appointment_time = body.get('time')     or body.get('appointment_time')
    appointment_type = body.get('type')     or body.get('appointment_type', 'Video Call')
    purpose          = body.get('purpose')  or body.get('notes', '')
    notes            = body.get('notes',    '')

    if not doctor_id or not appointment_date or not appointment_time:
        return error_response("doctorId, date, and time are required.", 400)

    # Verify doctor exists
    doctor = User.query.filter_by(id=doctor_id, role='doctor').first()
    if not doctor:
        return not_found_response("Doctor not found.")

    try:
        app_date = datetime.strptime(appointment_date, '%Y-%m-%d').date()
        try:
            app_time = datetime.strptime(appointment_time, '%I:%M %p').time()
        except ValueError:
            app_time = datetime.strptime(appointment_time, '%H:%M').time()
    except ValueError as e:
        return error_response(f"Invalid date/time format. {e}", 400)

    # ── Slot collision check ──────────────────────────────────
    existing = Appointment.query.filter_by(
        doctor_id=doctor_id,
        appointment_date=app_date,
        appointment_time=app_time,
    ).filter(Appointment.status.notin_(['cancelled', 'pending'])).first()

    if existing:
        return error_response(
            "This time slot is already booked. Please choose another time.", 400
        )

    # ── Verify doctor fee ────────────────────────────────────
    amount_inr = doctor.consultant_fee if doctor.consultant_fee is not None else 0
    if amount_inr < 1:
        return error_response("Doctor has not set a valid consultation fee.", 400)

    # ── Duplicate pending check (same patient + doctor + date) ─
    dup = Appointment.query.filter_by(
        user_id=user_id,
        doctor_id=doctor_id,
        appointment_date=app_date,
        payment_status='pending',
    ).first()
    if dup:
        try:
            # Return existing pending order so frontend can retry payment
            order = payment_service.create_razorpay_order(
                amount_inr=amount_inr,
                appointment_id=dup.id,
                notes={'patient_id': str(user_id), 'doctor_id': str(doctor_id)}
            )
            return success_response(
                data={
                    'appointmentId':   dup.id,
                    'orderId':         dup.razorpay_order_id or order['id'],
                    'amount':          amount_inr * 100,   # paise
                    'amountINR':       amount_inr,
                    'currency':        'INR',
                    'doctorName':      doctor.name,
                    'keyId':           current_app.config.get('RAZORPAY_KEY_ID', ''),
                    'allowSimulation': current_app.config.get('ALLOW_PAYMENT_SIMULATION', False),
                },
                message="Pending appointment found. Please complete payment."
            )
        except ValueError as e:
            logger.error(f"Payment Gateway Misconfigured for pending: {e}")
            return error_response("Payment gateway is temporarily misconfigured. Please contact support.", 503)
        except Exception as e:
            logger.error(f"Unexpected Payment Error for pending: {e}")
            return error_response("Failed to initialize payment. Please try again later.", 500)

    # ── Create Razorpay order ────────────────────────────────
    try:
        order = payment_service.create_razorpay_order(
            amount_inr=amount_inr,
            appointment_id=0,   # will update after DB save
            notes={'patient_id': str(user_id), 'doctor_id': str(doctor_id)}
        )
    except ValueError as e:
        logger.error(f"Payment Order Creation Failed: {e}")
        return error_response(
            "Payment gateway is temporarily misconfigured. Please contact support.", 503
        )
    except Exception as e:
        logger.error(f"Unexpected Payment Error: {e}")
        return error_response("Failed to initialize payment. Please try again later.", 500)

    # ── Save pending appointment ──────────────────────────────
    appointment = Appointment(
        user_id          = user_id,
        doctor_id        = doctor_id,
        appointment_date = app_date,
        appointment_time = app_time,
        appointment_type = appointment_type,
        purpose          = purpose or notes,
        notes            = notes,
        amount_paid      = amount_inr,
        razorpay_order_id = order['id'],
        status           = 'pending',
        payment_status   = 'pending',
    )
    db.session.add(appointment)
    db.session.commit()

    logger.info(
        f"[ORDER] Pending appointment {appointment.id} | "
        f"patient={user_id} | doctor={doctor_id} | order={order['id']}"
    )

    return created_response(
        data={
            'appointmentId': appointment.id,
            'orderId':       order['id'],
            'amount':        amount_inr * 100,   # paise for Razorpay JS SDK
            'amountINR':     amount_inr,
            'currency':      'INR',
            'doctorName':    doctor.name,
            'spec':          doctor.specialization or '',
            'keyId':         current_app.config.get('RAZORPAY_KEY_ID', ''),
            'allowSimulation': current_app.config.get('ALLOW_PAYMENT_SIMULATION', False),
        },
        message="Payment order created. Proceed to checkout."
    )


# ═══════════════════════════════════════════════════════════════
#  STEP 2 — Verify Payment & Confirm Appointment
# ═══════════════════════════════════════════════════════════════

def verify_and_confirm():
    """
    POST /api/appointments/verify-payment

    Verifies Razorpay signature, marks appointment confirmed,
    records PaymentTransaction, initiates doctor payout.
    """
    user_id = get_jwt_user_id()
    claims  = get_jwt_claims()

    if claims.get('role') != 'patient':
        return error_response("Only patients can confirm payments.", 403)

    body = request.get_json(force=True, silent=True) or {}

    appointment_id      = body.get('appointmentId')
    razorpay_order_id   = body.get('razorpayOrderId')   or body.get('order_id')
    razorpay_payment_id = body.get('razorpayPaymentId') or body.get('payment_id')
    razorpay_signature  = body.get('razorpaySignature') or body.get('signature', '')

    if not appointment_id or not razorpay_order_id or not razorpay_payment_id:
        return error_response("appointmentId, razorpayOrderId, and razorpayPaymentId are required.", 400)

    # Fetch appointment
    appointment = Appointment.query.filter_by(
        id=appointment_id, user_id=user_id
    ).first()
    if not appointment:
        return not_found_response("Appointment not found.")

    if appointment.payment_status == 'paid':
        return success_response(
            data=appointment.to_dict(),
            message="Appointment already confirmed."
        )

    # ── Verify Razorpay signature ─────────────────────────────
    is_valid = payment_service.verify_payment_signature(
        razorpay_order_id, razorpay_payment_id, razorpay_signature
    )

    if not is_valid:
        # Mark appointment as failed
        appointment.payment_status = 'failed'
        appointment.status         = 'cancelled'
        db.session.commit()

        # Log failed transaction
        _log_transaction(
            appointment_id      = appointment.id,
            user_id             = user_id,
            doctor_id           = appointment.doctor_id,
            razorpay_order_id   = razorpay_order_id,
            razorpay_payment_id = razorpay_payment_id,
            razorpay_signature  = razorpay_signature,
            amount_inr          = appointment.amount_paid or 0,
            status              = 'failed',
            failure_reason      = 'HMAC signature verification failed',
        )

        logger.warning(f"[PAYMENT FAILED] Invalid signature for appointment {appointment_id}")
        return error_response("Payment verification failed. Appointment not confirmed.", 402)

    # ── Calculate revenue split ───────────────────────────────
    amount_inr     = appointment.amount_paid or 0
    doctor_paise, platform_paise = payment_service.calculate_split(amount_inr)

    # ── Confirm appointment ───────────────────────────────────
    appointment.razorpay_payment_id = razorpay_payment_id
    appointment.razorpay_signature  = razorpay_signature
    appointment.transaction_id      = razorpay_payment_id
    appointment.payment_status      = 'paid'
    appointment.status              = 'confirmed'
    appointment.doctor_share        = doctor_paise
    appointment.platform_share      = platform_paise
    db.session.commit()
    _emit_appointment_event('appointment_updated', appointment)

    # ── Gamification: Award Coins ─────────────────────────────
    reward_service.award_coins(
        user_id=user_id, 
        amount=15, 
        activity="appointment_booked", 
        description=f"Booked appointment with Dr. {doctor.name if 'doctor' in locals() else 'Doctor'}"
    )

    # ── Log successful transaction ────────────────────────────
    txn = _log_transaction(
        appointment_id      = appointment.id,
        user_id             = user_id,
        doctor_id           = appointment.doctor_id,
        razorpay_order_id   = razorpay_order_id,
        razorpay_payment_id = razorpay_payment_id,
        razorpay_signature  = razorpay_signature,
        amount_inr          = amount_inr,
        status              = 'captured',
        doctor_share        = doctor_paise,
        platform_share      = platform_paise,
    )

    # ── Initiate doctor payout (Razorpay Route) ───────────────
    doctor = User.query.get(appointment.doctor_id)
    transfer_result = {'id': None, 'status': 'skipped'}
    if doctor:
        doctor_account_id = getattr(doctor, 'razorpay_account_id', None)
        transfer_result = payment_service.initiate_doctor_transfer(
            payment_id        = razorpay_payment_id,
            doctor_account_id = doctor_account_id,
            doctor_share_paise = doctor_paise,
        )
        if txn:
            txn.transfer_id     = transfer_result.get('id')
            txn.transfer_status = transfer_result.get('status')
            db.session.commit()

    logger.info(
        f"✅ [CONFIRMED] Appointment {appointment.id} | "
        f"txn={razorpay_payment_id} | amount=₹{amount_inr} | "
        f"doctor=₹{doctor_paise/100:.2f} | platform=₹{platform_paise/100:.2f}"
    )

    return success_response(
        data={
            'appointment':    appointment.to_dict(),
            'transactionId':  razorpay_payment_id,
            'doctorShare':    doctor_paise,
            'platformShare':  platform_paise,
            'transferStatus': transfer_result.get('status'),
        },
        message="✅ Payment verified! Appointment confirmed successfully."
    )


# ═══════════════════════════════════════════════════════════════
#  GET — Patient Appointments
# ═══════════════════════════════════════════════════════════════

def get_patient_appointments():
    """GET /api/appointments — list patient appointments (gated details)."""
    user_id = get_jwt_user_id()
    claims  = get_jwt_claims()

    if claims.get('role') != 'patient':
        return error_response("Only patients can view patient appointments.", 403)

    appointments = (
        Appointment.query
        .filter_by(user_id=user_id)
        .filter(Appointment.status != 'pending')   # hide unconfirmed pending
        .order_by(Appointment.appointment_date.desc())
        .all()
    )
    return success_response(
        data={'appointments': [a.to_dict() for a in appointments]},
        message="Appointments retrieved."
    )


# ═══════════════════════════════════════════════════════════════
#  GET — Doctor Appointments
# ═══════════════════════════════════════════════════════════════

def get_doctor_appointments():
    """GET /api/appointments/doctor — list doctor's appointments."""
    user_id = get_jwt_user_id()
    claims  = get_jwt_claims()

    if claims.get('role') != 'doctor':
        return error_response("Only doctors can view doctor appointments.", 403)

    appointments = (
        Appointment.query
        .filter_by(doctor_id=user_id)
        .filter(Appointment.payment_status == 'paid')   # only paid bookings
        .order_by(Appointment.appointment_date.desc())
        .all()
    )
    return success_response(
        data={'appointments': [a.to_dict(include_sensitive=True) for a in appointments]},
        message="Doctor appointments retrieved."
    )


def get_organization_appointments():
    """GET /api/appointments - list appointments for hospital-linked doctors."""
    user_id = get_jwt_user_id()
    claims = get_jwt_claims()

    if claims.get('role') != 'organization':
        return error_response("Only hospital admins can view hospital appointments.", 403)

    doctors = User.query.filter_by(hospital_id=user_id, role='doctor').all()
    doctor_ids = [doctor.id for doctor in doctors]
    if not doctor_ids:
        return success_response(data={'appointments': []}, message="Hospital appointments retrieved.")

    appointments = (
        Appointment.query
        .filter(Appointment.doctor_id.in_(doctor_ids))
        .filter(Appointment.payment_status == 'paid')
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
        .all()
    )
    return success_response(
        data={'appointments': [appointment.to_dict(include_sensitive=True) for appointment in appointments]},
        message="Hospital appointments retrieved."
    )


# ═══════════════════════════════════════════════════════════════
#  GET — Download PDF Receipt
# ═══════════════════════════════════════════════════════════════

def get_appointment_receipt(appointment_id: int):
    """GET /api/appointments/<id>/receipt — generate and stream PDF receipt."""
    user_id = get_jwt_user_id()
    claims  = get_jwt_claims()

    # Allow patient (own) or doctor (their appointments)
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return not_found_response("Appointment not found.")

    role = claims.get('role')
    if role == 'patient' and appointment.user_id != user_id:
        return error_response("Access denied.", 403)
    if role == 'doctor' and appointment.doctor_id != user_id:
        return error_response("Access denied.", 403)

    if appointment.payment_status != 'paid':
        return error_response("Receipt is only available for paid appointments.", 402)

    patient = User.query.get(appointment.user_id)
    doctor  = User.query.get(appointment.doctor_id)

    pdf_bytes = pdf_service.generate_appointment_receipt(
        appointment = appointment.to_dict(include_sensitive=True),
        patient     = patient.to_dict() if patient else {},
        doctor      = doctor.to_dict()  if doctor  else {},
    )

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'VaidyaMedX_Receipt_APT{appointment_id:05d}.pdf',
    )


# ═══════════════════════════════════════════════════════════════
#  PUT — Cancel Appointment
# ═══════════════════════════════════════════════════════════════

def cancel_appointment(appointment_id: int):
    """PUT /api/appointments/<id>/cancel"""
    user_id = get_jwt_user_id()
    claims  = get_jwt_claims()

    appointment = Appointment.query.filter_by(id=appointment_id).first()
    if not appointment:
        return not_found_response("Appointment not found.")

    # Only owning patient or admin can cancel
    role = claims.get('role')
    if role == 'patient' and appointment.user_id != user_id:
        return error_response("You can only cancel your own appointments.", 403)

    if appointment.status == 'cancelled':
        return error_response("Appointment is already cancelled.", 400)

    appointment.status = 'cancelled'
    db.session.commit()
    _emit_appointment_event('appointment_updated', appointment)

    logger.info(f"Appointment {appointment_id} cancelled by user {user_id}")
    return success_response(message="Appointment cancelled successfully.")


# ═══════════════════════════════════════════════════════════════
#  Private Helper
# ═══════════════════════════════════════════════════════════════

def _log_transaction(
    appointment_id, user_id, doctor_id,
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    amount_inr, status,
    doctor_share=None, platform_share=None, failure_reason=None
) -> PaymentTransaction:
    """Save a PaymentTransaction audit record."""
    try:
        txn = PaymentTransaction(
            appointment_id      = appointment_id,
            user_id             = user_id,
            doctor_id           = doctor_id,
            razorpay_order_id   = razorpay_order_id,
            razorpay_payment_id = razorpay_payment_id,
            razorpay_signature  = razorpay_signature,
            amount              = int(amount_inr) * 100,   # store in paise
            currency            = 'INR',
            status              = status,
            doctor_share        = doctor_share,
            platform_share      = platform_share,
            failure_reason      = failure_reason,
        )
        db.session.add(txn)
        db.session.commit()
        return txn
    except Exception as exc:
        logger.error(f"Failed to log payment transaction: {exc}")
        db.session.rollback()
        return None

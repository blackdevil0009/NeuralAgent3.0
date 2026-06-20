"""
app/controllers/v2_controller.py — Strict Messaging Logic
"""

import logging
from flask import request, jsonify
from app.extensions import db, socketio
from app.models.message import Message
from app.models.appointment import Appointment
from app.models.user import User
from app.middleware import get_jwt_user_id, get_jwt_claims
from app.utils import success_response, error_response, created_response, forbidden_response

logger = logging.getLogger(__name__)

def send_v2_message():
    """POST /api/v2/messages/send"""
    sender_id = get_jwt_user_id()
    claims = get_jwt_claims()
    
    body = request.get_json(force=True, silent=True) or {}
    receiver_id = body.get('receiverId')
    content = body.get('content')
    
    if not receiver_id or not content:
        return error_response("receiverId and content are required.", 400)

    # ── STRICT APPOINTMENT CHECK ──
    # Check if a BOOKED appointment exists between sender and receiver
    # We check both ways if we want doctors to reply, but usually messages are linked to an active session.
    # The requirement is: "Messaging ONLY allowed IF appointment is booked."
    
    # Identify who is patient and who is doctor
    patient_id = sender_id if claims.get('role') == 'patient' else receiver_id
    doctor_id = sender_id if claims.get('role') == 'doctor' else receiver_id

    appointment = Appointment.query.filter_by(
        user_id=patient_id, 
        doctor_id=doctor_id
    ).filter(Appointment.status.in_(['booked', 'confirmed', 'pending'])).first()

    if not appointment:
         return forbidden_response("You can only chat after booking an appointment.")

    # Save to DB
    new_msg = Message(
        appointment_id=appointment.id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        content=content,
        message_type=body.get('messageType') or body.get('message_type') or 'text'
    )
    
    db.session.add(new_msg)
    db.session.commit()
    
    # EMIT TO SOCKET
    socketio.emit('new_inbox_msg', new_msg.to_dict())

    logger.info(f"V2 Message sent: sender={sender_id}, receiver={receiver_id}, appt={appointment.id}")
    
    return created_response(
        data=new_msg.to_dict(),
        message="Message sent successfully."
    )

def get_v2_history(peer_id):
    """GET /api/v2/messages/history/<peer_id>"""
    user_id = get_jwt_user_id()
    claims = get_jwt_claims()
    
    # Re-use the appointment check for history too
    patient_id = user_id if claims.get('role') == 'patient' else peer_id
    doctor_id = user_id if claims.get('role') == 'doctor' else peer_id

    appointment = Appointment.query.filter_by(
        user_id=patient_id, 
        doctor_id=doctor_id
    ).filter(Appointment.status.in_(['booked', 'confirmed', 'completed'])).first()

    if not appointment:
        return success_response(data={'messages': []}, message="No authorized appointment found.")

    messages = Message.query.filter_by(appointment_id=appointment.id).order_by(Message.created_at.asc()).all()
    
    return success_response(
        data={'messages': [m.to_dict() for m in messages]},
        message="History retrieved successfully."
    )

def upload_key():
    """POST /api/v2/keys/upload"""
    # Simple placeholder as per previous state
    return success_response(message="Public key updated.")

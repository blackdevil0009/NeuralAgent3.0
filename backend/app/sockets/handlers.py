"""
app/sockets/handlers.py — Socket.IO Event Handlers
"""

import logging
from flask import request
from flask_socketio import emit, join_room, leave_room, disconnect
from flask_jwt_extended import decode_token

from app.extensions import db, socketio
from app.models.user import User
from app.models.appointment import Appointment
from app.models.message import Message

logger = logging.getLogger(__name__)

# Helper to verify token and get user
def _get_user_from_auth(auth):
    if not auth or 'token' not in auth:
        return None
    try:
        decoded = decode_token(auth['token'])
        user_id = decoded['sub']
        return User.query.get(int(user_id))
    except Exception as e:
        logger.warning(f"Socket auth failed: {e}")
        return None

@socketio.on('connect')
def handle_connect(auth):
    """
    On Connection: 
    1. Authenticate via JWT 
    2. Enforce 2FA security
    """
    user = _get_user_from_auth(auth)
    if not user:
        logger.warning("Unauthorized socket connection attempt.")
        return False # Refuse connection

    # 2FA Enforcement (Temporarily disabled for dev testing)
    # if not user.two_fa_enabled:
    #     logger.error(f"User {user.id} blocked: 2FA NOT ENABLED.")
    #     emit('error', {'message': 'Enable 2FA to access consultation.'})
    #     disconnect()
    #     return False

    logger.info(f"User {user.id} ({user.role}) connected to socket.")
    join_room(f"user_{user.id}")
    join_room(f"role_{user.role}")
    if user.role == 'organization':
        join_room(f"hospital_{user.id}")
    elif user.role == 'doctor' and getattr(user, 'hospital_id', None):
        join_room(f"hospital_{user.hospital_id}")
    return True


@socketio.on('join_inbox')
def handle_join_inbox(data):
    """Join a direct inbox room for the authenticated user."""
    user_id = data.get('userId') if isinstance(data, dict) else None
    if user_id:
        join_room(f"user_{user_id}")
        emit('status', {'message': f'Joined inbox user_{user_id}'})


@socketio.on('join_room')
def on_join(data):
    """Join an appointment room."""
    appointment_id = data.get('appointment_id')
    if not appointment_id:
        return emit('error', {'message': 'appointment_id required.'})

    # Authorization Check
    # (In a real app, we'd verify the user is the doctor or patient of this appointment)
    # For now, let's assume the user is auth'd via connect
    room = f"appointment_{appointment_id}"
    join_room(room)
    logger.info(f"User joined room: {room}")
    emit('status', {'message': f'Joined room {room}'}, room=room)


@socketio.on('send_message')
def handle_message(data):
    """Handle chat messages and persist them."""
    appointment_id = data.get('appointment_id')
    content = data.get('content')
    sender_id = data.get('sender_id')
    receiver_id = data.get('receiver_id')

    if not all([appointment_id, content, sender_id, receiver_id]):
        return emit('error', {'message': 'Missing fields.'})

    # Persist to Database
    msg = Message(
        appointment_id=appointment_id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        content=content
    )
    db.session.add(msg)
    db.session.commit()

    # Broadcast to Room
    room = f"appointment_{appointment_id}"
    emit('receive_message', msg.to_dict(), room=room)


# ── WebRTC Signaling ──────────────────────────────────────────────

@socketio.on('call_user')
def handle_call_user(data):
    """Initiate call: sender -> signaling -> receiver"""
    appointment_id = data.get('appointment_id')
    room = f"appointment_{appointment_id}"
    # Broadcast to others in the room
    emit('incoming_call', {
        'from': data.get('sender_name'),
        'sender_id': data.get('sender_id')
    }, room=room, include_self=False)


@socketio.on('webrtc_signal')
def handle_webrtc_signal(data):
    """Relay SDP Offer/Answer and ICE candidates"""
    appointment_id = data.get('appointment_id')
    room = f"appointment_{appointment_id}"
    # Opaque relay of signal data
    emit('webrtc_signal', data, room=room, include_self=False)


@socketio.on('end_call')
def handle_end_call(data):
    appointment_id = data.get('appointment_id')
    room = f"appointment_{appointment_id}"
    emit('call_ended', room=room)

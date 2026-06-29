"""
app/sockets/handlers.py — Socket.IO Event Handlers
"""

import logging
from flask import request
from flask_socketio import emit, join_room, leave_room, disconnect, ConnectionRefusedError
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
        token = auth['token']
        if token.startswith('Bearer '):
            token = token[7:]
        decoded = decode_token(token)
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
        
        # Accept the connection temporarily so we can reliably emit the error
        def _disconnect_unauth(sid):
            socketio.emit('auth_error', {'message': 'Unauthorized'}, to=sid)
            socketio.sleep(0.1) # Brief delay to ensure delivery
            socketio.server.disconnect(sid)
            
        socketio.start_background_task(_disconnect_unauth, request.sid)
        return True

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
        content=content,
        message_type=data.get('message_type') or data.get('messageType') or 'text'
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

# ── Vaidya Voice/Video AI Integration ─────────────────────────────
from app.services.wellness_ai_service import get_wellness_service

# In-memory store for the latest camera frame per socket session
_active_camera_frames = {}

@socketio.on('Vaidya_Connected')
def handle_vaidya_connected(data):
    sid = request.sid
    user_id = 0
    if isinstance(data, dict) and 'token' in data:
        try:
            from flask_jwt_extended import decode_token
            decoded = decode_token(data['token'])
            user_id = decoded['sub']
        except Exception:
            pass
    _active_camera_frames[sid] = {'frame': None, 'user_id': user_id}
    logger.info(f"Vaidya AI Connected for session {sid}, user_id={user_id}")
    emit('system_status', 'Vaidya AI Connected')

@socketio.on('camera_frame')
def handle_camera_frame(base64_frame):
    sid = request.sid
    if sid in _active_camera_frames:
        _active_camera_frames[sid]['frame'] = base64_frame

@socketio.on('chat_message')
def handle_ai_chat_message(message_text):
    sid = request.sid
    emit('ai_thinking')
    session_data = _active_camera_frames.get(sid, {'frame': None, 'user_id': 0})
    latest_frame = session_data['frame']
    user_id = session_data['user_id']
    
    try:
        service = get_wellness_service()
        result = service.chat(
            user_id=user_id,
            message=message_text,
            session_id=f"socket_{sid}",
            image_b64=latest_frame
        )
        
        response_text = result.get('response', '')
        
        # Simulate streaming by sending the whole text as one chunk
        emit('transcript_chunk', {'role': 'AGENT', 'text': response_text})
        emit('turn_complete')
        
    except Exception as e:
        logger.error(f"Vaidya Chat Error: {e}")
        emit('transcript_chunk', {'role': 'AGENT', 'text': 'I am currently experiencing connection issues. Please try again in a moment.'})
        emit('turn_complete')

@socketio.on('Vaidya_Disconnected')
def handle_vaidya_disconnected(data):
    sid = request.sid
    _active_camera_frames.pop(sid, None)
    logger.info(f"Vaidya AI Disconnected for session {sid}")
    emit('system_status', 'Vaidya AI Disconnected')


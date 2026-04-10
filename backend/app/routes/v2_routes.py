"""
app/routes/v2_routes.py — V2 Chat & Cryptography Endpoints (Inbox Support)
"""

from flask import Blueprint, request, jsonify
from app.middleware import jwt_required_custom

v2_bp = Blueprint('v2', __name__, url_prefix='/api/v2')

@v2_bp.route('/keys/upload', methods=['POST'])
@jwt_required_custom
def upload_key():
    data = request.get_json()
    if not data or 'publicKey' not in data:
        return jsonify({'success': False, 'message': 'Public key required.'}), 400
    
    # In a real app, we'd store this in the User model. 
    # For now, we just acknowledge to unblock the UI.
    return jsonify({'success': True, 'message': 'Public key updated.'}), 200

@v2_bp.route('/messages/history/<int:id>', methods=['GET'])
@jwt_required_custom
def get_v2_history(id):
    # Mock history to unblock the UI
    return jsonify({
        'success': True, 
        'data': {
            'messages': []
        },
        'message': 'History retrieved.'
    }), 200

@v2_bp.route('/messages/send', methods=['POST'])
@jwt_required_custom
def send_v2_message():
    data = request.get_json()
    if not data or 'receiverId' not in data or 'content' not in data:
        return jsonify({'success': False, 'message': 'Receiver and content required.'}), 400
    
    # Log the sent message for debugging
    print(f"DEBUG: V2 Message sent to {data['receiverId']}: {data['content'][:]}")
    
    return jsonify({
        'success': True,
        'data': {
            'id': 'v2-msg-' + str(id(data)), # unique-ish id
            'status': 'sent'
        },
        'message': 'Message sent.'
    }), 200

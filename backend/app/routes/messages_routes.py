"""
app/routes/messages_routes.py — Specific Message Endpoints as per User Spec
"""

from flask import Blueprint, request
from app.controllers.v2_controller import send_v2_message
from app.services.chat_service import get_chat_history
from app.middleware import jwt_required_custom
from app.utils import success_response

messages_bp = Blueprint('messages', __name__, url_prefix='/api/messages')

@messages_bp.route('', methods=['POST'])
@jwt_required_custom
def send_msg():
    """POST /api/messages"""
    return send_v2_message()

@messages_bp.route('/<int:appointment_id>', methods=['GET'])
@jwt_required_custom
def get_msgs(appointment_id):
    """GET /api/messages/<appointment_id>"""
    history = get_chat_history(appointment_id)
    return success_response(data=history, message="Messages retrieved.")

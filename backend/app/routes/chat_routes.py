"""
app/routes/chat_routes.py — Chat HTTP Endpoints
"""

from flask import Blueprint
from app.controllers.chat_controller import fetch_history
from app.middleware import jwt_required_custom

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

@chat_bp.route('/history/<int:appointment_id>', methods=['GET'])
@jwt_required_custom
def get_history(appointment_id):
    return fetch_history(appointment_id)

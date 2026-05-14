"""
app/routes/consultation_routes.py — Consultation Security
"""

from flask import Blueprint
from app.controllers.consultation_controller import (
    check_consultation_access,
    create_ai_consultation_notes,
    start_consultation_session,
)
from app.middleware import jwt_required_custom

consultation_bp = Blueprint('consultation', __name__, url_prefix='/api/consultation')

@consultation_bp.route('/access-check', methods=['GET'])
@jwt_required_custom
def check_access():
    return check_consultation_access()


@consultation_bp.route('/session/start', methods=['POST'])
@jwt_required_custom
def start_session():
    return start_consultation_session()


@consultation_bp.route('/<int:consultation_id>/ai-notes', methods=['POST'])
@jwt_required_custom
def ai_notes(consultation_id):
    return create_ai_consultation_notes()

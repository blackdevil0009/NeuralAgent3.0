"""
app/routes/consultation_routes.py — Consultation Security
"""

from flask import Blueprint
from app.controllers.consultation_controller import check_consultation_access
from app.middleware import jwt_required_custom

consultation_bp = Blueprint('consultation', __name__, url_prefix='/api/consultation')

@consultation_bp.route('/access-check', methods=['GET'])
@jwt_required_custom
def check_access():
    return check_consultation_access()

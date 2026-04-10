"""
app/routes/user_routes.py — User Profile Blueprint

Endpoints:
  GET /api/user/profile   — fetch logged-in user's profile
  PUT /api/user/profile   — update logged-in user's profile
"""

from flask import Blueprint
from app.controllers import get_profile, update_profile
from app.middleware  import jwt_required_custom

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

@user_bp.route('/profile', methods=['GET'])
@jwt_required_custom
def profile_get():
    return get_profile()

@user_bp.route('/profile', methods=['PUT'])
@jwt_required_custom
def profile_put():
    return update_profile()

"""
app/controllers/consultation_controller.py — Security Access Logic
"""

import logging
from app.models.user import User
from app.middleware import get_jwt_user_id
from app.utils import success_response, forbidden_response, not_found_response

logger = logging.getLogger(__name__)

def check_consultation_access():
    """GET /api/consultation/access-check"""
    user_id = get_jwt_user_id()
    user = User.query.get(int(user_id))

    if not user:
        return not_found_response("User not found.")

    if not user.two_fa_enabled:
        logger.warning(f"Access blocked for user {user_id} - 2FA not enabled.")
        return forbidden_response("Security not enabled. Please enable 2FA first.")

    return success_response(message="Security Enabled")

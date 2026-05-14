"""
app/routes/auth_routes.py — Authentication Blueprint

Endpoints:
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/verify-email            (token link)
  POST /api/auth/verify-registration-otp
  POST /api/auth/verify-2fa-otp
  POST /api/auth/resend-verification
  POST /api/auth/resend-2fa-otp
  POST /api/forgot-password
  POST /api/reset-password
"""

from flask import Blueprint
from app.controllers import (
    register, login,
    verify_email_token,
    verify_registration_otp,
    verify_2fa_otp,
    resend_verification,
    resend_2fa_otp,
    forgot_password,
    reset_password,
    toggle_2fa,
    verify_document_ocr,
)

from app.middleware import jwt_required_custom

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ── Private endpoints (JWT required) ─────────────────────────────
auth_bp.add_url_rule(
    '/2fa/toggle',
    view_func=jwt_required_custom(toggle_2fa),
    methods=['POST']
)

# ── Public endpoints (no JWT required) ───────────────────────────
auth_bp.add_url_rule('/register',              view_func=register,              methods=['POST'])
auth_bp.add_url_rule('/login',                 view_func=login,                 methods=['POST'])
auth_bp.add_url_rule('/verify-email',          view_func=verify_email_token,    methods=['GET'])
auth_bp.add_url_rule('/verify-registration-otp', view_func=verify_registration_otp, methods=['POST'])
auth_bp.add_url_rule('/verify-2fa-otp',        view_func=verify_2fa_otp,        methods=['POST'])
auth_bp.add_url_rule('/resend-verification',   view_func=resend_verification,   methods=['POST'])
auth_bp.add_url_rule('/resend-2fa-otp',        view_func=resend_2fa_otp,        methods=['POST'])
auth_bp.add_url_rule('/forgot-password',       view_func=forgot_password,       methods=['POST'])
auth_bp.add_url_rule('/reset-password',        view_func=reset_password,        methods=['POST'])
auth_bp.add_url_rule('/verify-document',       view_func=verify_document_ocr,   methods=['POST'])

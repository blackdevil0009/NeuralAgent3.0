"""
app/middleware/auth_middleware.py — JWT Auth Decorators (MySQL Edition)
user_id stored in JWT is a string representation of an integer PK.
"""

import logging
from functools import wraps

from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.utils.response import unauthorized_response, forbidden_response

logger = logging.getLogger(__name__)


def jwt_required_custom(fn):
    """Require a valid JWT — returns JSON 401 on failure."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception as exc:
            logger.warning(f"JWT check failed: {exc}")
            return unauthorized_response('Authentication required. Please log in again.')
        return fn(*args, **kwargs)
    return wrapper


def roles_required(*allowed_roles):
    """
    Decorator factory — restrict access to specific roles.
    Must be used AFTER @jwt_required_custom.

    Example:
        @jwt_required_custom
        @roles_required('doctor')
        def doctor_only(): ...
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims    = get_jwt()
                user_role = claims.get('role', '')
                if user_role not in allowed_roles:
                    return forbidden_response(
                        f'Access denied. Required role: {" or ".join(allowed_roles)}.'
                    )
            except Exception as exc:
                logger.warning(f"Role check failed: {exc}")
                return unauthorized_response('Authentication required.')
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user():
    """Fetch the full User ORM object for the current JWT identity."""
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        from flask import current_app
        from app.models.user import User
        return User.query.get(int(user_id))
    except Exception:
        return None


def get_jwt_user_id() -> str:
    """Return the user's PK (as string) from the JWT identity."""
    try:
        verify_jwt_in_request()
        return get_jwt_identity()
    except Exception:
        return None


def get_jwt_claims() -> dict:
    """Return additional JWT claims dict (contains 'role' etc.)."""
    try:
        verify_jwt_in_request()
        return get_jwt()
    except Exception:
        return {}

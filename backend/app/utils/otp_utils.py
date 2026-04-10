"""
app/utils/otp_utils.py — OTP Generation & Management
"""

import random
import string


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically-safe numeric OTP."""
    return ''.join(random.SystemRandom().choices(string.digits, k=length))


def generate_token(length: int = 64) -> str:
    """Generate a URL-safe random token for email verification / password resets."""
    import secrets
    return secrets.token_urlsafe(length)

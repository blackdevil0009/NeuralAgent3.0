import secrets

def generate_otp():
    """Generates a secure 6-digit numeric OTP."""
    # Using 'secrets' instead of 'random' for cryptographic security
    return str(secrets.randbelow(900000) + 100000)

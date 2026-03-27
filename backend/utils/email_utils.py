import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SENDER_EMAIL = 'vaidyamedx@gmail.com'
SENDER_PASSWORD = 'ibes vhks akgu mcyi'

try:
    import gevent
    HAS_GEVENT = True
except ImportError:
    HAS_GEVENT = False
import threading

def _send_email_async_worker(to_email, subject, body):
    """
    Background worker to handle the SMTP handshake and transmission without blocking the user.
    """
    try:
        msg = MIMEMultipart()
        msg['From'] = f"VaidyaMed-X <{SENDER_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        try:
            # Try Port 587 (TLS)
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
            server.quit()
        except Exception as e1:
            # Fallback to Port 465 (SSL)
            try:
                server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
                server.login(SENDER_EMAIL, SENDER_PASSWORD)
                server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
                server.quit()
            except Exception as e2:
                print(f"SMTP Failure - Async P587: {e1} | P465: {e2}")
    except Exception as e:
        print(f"Error in _send_email_async_worker: {e}")

def _send_email_common(to_email, subject, body):
    """
    Uses threading.Thread to send emails in the background.
    Native threading avoids freezing the Gevent loop during slow SMTP DNS resolution or SSL handshakes.
    """
    thread = threading.Thread(target=_send_email_async_worker, args=(to_email, subject, body), daemon=True)
    thread.start()
    return True

def send_verification_email(to_email, verification_link, verification_otp):
    subject = "Verify your VaidyaMed-X Account"
    body = f"""Welcome to VaidyaMed-X!

You can verify your email address using either of the methods below:

1. Click the verification link:
{verification_link}

2. Use the verification code (OTP):
{verification_otp}

If you did not create an account, please ignore this email.

Best regards,
VaidyaMed-X Team"""
    return _send_email_common(to_email, subject, body)

def send_reset_email(to_email, reset_link, reset_token=None):
    subject = "VaidyaMed-X - Password Reset Request"
    body = f"""Hello,

You requested a password reset for your VaidyaMed-X account.
Please click the link below to reset your password:

{reset_link}

If you did not request this, please ignore this email.

Best regards,
VaidyaMed-X Team"""
    return _send_email_common(to_email, subject, body)

def send_otp_email(to_email, otp):
    """
    Sends a 6-digit OTP code for 2FA.
    """
    subject = f"VaidyaMed-X - Your Security Code: {otp}"
    body = f"""Hello,

Your security verification code is: {otp}

This code will expire in 5 minutes. Do not share this code with anyone.

Best regards,
VaidyaMed-X Team"""
    return _send_email_common(to_email, subject, body)

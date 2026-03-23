import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SENDER_EMAIL = 'vaidyamedx@gmail.com'
SENDER_PASSWORD = 'ibes vhks akgu mcyi'

def _send_email_common(to_email, subject, body):
    """
    Internal helper to send email with Port 587/465 fallback.
    """
    try:
        msg = MIMEMultipart()
        msg['From'] = f"VaidyaMed-X <{SENDER_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        try:
            try:
                # Try Port 587 (TLS)
                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(SENDER_EMAIL, SENDER_PASSWORD)
                server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
                server.quit()
                return True
            except Exception as e1:
                # Fallback to Port 465 (SSL)
                try:
                    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
                    server.login(SENDER_EMAIL, SENDER_PASSWORD)
                    server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
                    server.quit()
                    return True
                except Exception as e2:
                    print(f"SMTP Critical Failure:")
                    print(f"  - Port 587 (TLS) Error: {str(e1)}")
                    print(f"  - Port 465 (SSL) Error: {str(e2)}")
                    print(f"  - Check if 'Less Secure Apps' is enabled or use an App Password for {SENDER_EMAIL}")
                    return False
        except Exception as e:
            print(f"Error in _send_email_common: {str(e)}")
            return False

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

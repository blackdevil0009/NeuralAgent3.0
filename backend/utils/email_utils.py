import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_verification_email(to_email, verification_link):
    """
    Sends an account verification email using SMTP.
    """
    sender_email = 'vaidyamedx@gmail.com'
    sender_password = 'Devil@2007%'

    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = to_email
        msg['Subject'] = "Verify your VaidyaMed-X Account"

        body = f"""
        Welcome to VaidyaMed-X!

        Please click the link below to verify your email address and activate your account:
        
        {verification_link}

        If you did not create an account, please ignore this email.

        Best regards,
        VaidyaMed-X Team
        """
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, to_email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending verification email to {to_email}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def send_reset_email(to_email, reset_link, reset_token=None):
    """
    Sends a password reset email using SMTP.
    """
    sender_email = 'vaidyamedx@gmail.com'
    sender_password = 'Devil@2007%'

    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = to_email
        msg['Subject'] = "VaidyaMed-X - Password Reset Request"

        body = f"""
        Hello,

        You requested a password reset for your VaidyaMed-X account.
        Please click the link below to reset your password:
        
        {reset_link}

        If you did not request this, please ignore this email.

        Best regards,
        VaidyaMed-X Team
        """
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, to_email, text)
        server.quit()
        return True

    except Exception as e:
        print(f"Error sending reset email to {to_email}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


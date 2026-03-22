import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_verification_email(to_email, verification_link):
    """
    Sends an account verification email using SMTP with fallback.
    """
    sender_email = 'vaidyamedx@gmail.com'
    sender_password = 'ibes vhks akgu mcyi'

    try:
        msg = MIMEMultipart()
        msg['From'] = f"VaidyaMed-X <{sender_email}>"
        msg['To'] = to_email
        msg['Subject'] = "Verify your VaidyaMed-X Account"
        
        body = f"""Welcome to VaidyaMed-X!

Please click the link below to verify your email address and activate your account:

{verification_link}

If you did not create an account, please ignore this email.

Best regards,
VaidyaMed-X Team"""
        msg.attach(MIMEText(body, 'plain'))

        try:
            # Try Port 587 (TLS)
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
            server.quit()
            return True
        except Exception as e1:
            try:
                # Fallback to Port 465 (SSL)
                server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, to_email, msg.as_string())
                server.quit()
                return True
            except Exception as e2:
                print(f"SMTP Verification Fail: P587({str(e1)}) | P465({str(e2)})")
                return False
    except Exception as e:
        print(f"Error in send_verification_email: {str(e)}")
        return False

def send_reset_email(to_email, reset_link, reset_token=None):
    """
    Sends a password reset email using SMTP with fallback.
    """
    sender_email = 'vaidyamedx@gmail.com'
    sender_password = 'ibes vhks akgu mcyi'

    try:
        msg = MIMEMultipart()
        msg['From'] = f"VaidyaMed-X <{sender_email}>"
        msg['To'] = to_email
        msg['Subject'] = "VaidyaMed-X - Password Reset Request"

        body = f"""Hello,

You requested a password reset for your VaidyaMed-X account.
Please click the link below to reset your password:

{reset_link}

If you did not request this, please ignore this email.

Best regards,
VaidyaMed-X Team"""
        msg.attach(MIMEText(body, 'plain'))

        try:
            # Try Port 587 (TLS)
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
            server.quit()
            return True
        except Exception as e1:
            try:
                # Fallback to Port 465 (SSL)
                server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, to_email, msg.as_string())
                server.quit()
                return True
            except Exception as e2:
                print(f"SMTP Reset Fail: P587({str(e1)}) | P465({str(e2)})")
                return False
    except Exception as e:
        print(f"Error in send_reset_email: {str(e)}")
        return False

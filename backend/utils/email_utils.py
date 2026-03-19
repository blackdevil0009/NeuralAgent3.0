import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_reset_email(to_email, reset_link, reset_token=None):
    """
    Sends a password reset email using SMTP.
    If SMTP variables are not set, it prints the reset link to the console for testing.
    """
    sender_email = 'vaidyamedx@gmail.com'
    # IMPORTANT: Since this is a @gmail.com address, you cannot use your regular account password.
    # You MUST generate a 16-character "App Password" from your Google Account Security settings.
    sender_password = 'Devil@2007%' # <-- Replace this with your Google App Password

    # For testing/free local use if SMTP isn't configured, print to console
    if not sender_email or not sender_password:
        print(f"\n{'='*50}\n[TEST MODE] SMTP not configured.\nPassword Reset Link for {to_email}:\n{reset_link}\n(Token: {reset_token})\n{'='*50}\n")
        # Still return True to allow the flow to continue, as if sent successfully
        return True

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

        # Connect to Gmail SMTP (since email is vaidyamedx@gmail.com)
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, to_email, text)
        server.quit()
        return True

    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        # Even if it fails, maybe print the link to the terminal so the user is not stuck
        print(f"[FALLBACK] Email failed. Reset link: {reset_link}")
        return False

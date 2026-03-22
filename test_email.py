import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys

def test_email(sender_email, sender_password, to_email):
    print(f"Testing SMTP with {sender_email} to {to_email}...")
    try:
        msg = MIMEMultipart()
        msg['From'] = f"VaidyaMed-X Test <{sender_email}>"
        msg['To'] = to_email
        msg['Subject'] = "VaidyaMed-X SMTP Test"
        msg.attach(MIMEText("This is a test email to verify SMTP configuration with the App Password.", 'plain'))

        # Try Port 587 (TLS)
        print("Connecting to smtp.gmail.com:587 (TLS)...")
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.set_debuglevel(1)
        server.starttls()
        print("Logging in...")
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        print("\nSUCCESS: Email sent via Port 587!")
        return True

    except Exception as e:
        print(f"\nFAILED on Port 587: {str(e)}")
        
        # Try Port 465 (SSL) as fallback
        try:
            print("\nRetrying with Port 465 (SSL)...")
            server_ssl = smtplib.SMTP_SSL('smtp.gmail.com', 465)
            server_ssl.set_debuglevel(1)
            print("Logging in...")
            server_ssl.login(sender_email, sender_password)
            server_ssl.sendmail(sender_email, to_email, msg.as_string())
            server_ssl.quit()
            print("\nSUCCESS: Email sent via Port 465!")
            return True
        except Exception as e2:
            print(f"\nFAILED on Port 465: {str(e2)}")
            return False

if __name__ == "__main__":
    email = "vaidyamedx@gmail.com"
    # UPDATED with the new App Password
    password = "ibes vhks akgu mcyi" 
    target = sys.argv[1] if len(sys.argv) > 1 else email
    
    test_email(email, password, target)

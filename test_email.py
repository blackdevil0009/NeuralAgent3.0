import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys
import time

def test_email(sender_email, sender_password, to_email):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    unique_id = int(time.time())
    print(f"[{timestamp}] Testing SMTP with {sender_email} to {to_email}...")
    
    try:
        msg = MIMEMultipart()
        msg['From'] = f"VaidyaMed-X Diagnostic <{sender_email}>"
        msg['To'] = to_email
        msg['Subject'] = f"VaidyaMed-X Test | ID: {unique_id} | {timestamp}"
        
        body = f"This is a diagnostic email sent at {timestamp}.\n\nIf you see this, SMTP is working perfectly.\n\nTest ID: {unique_id}"
        msg.attach(MIMEText(body, 'plain'))

        print(f"Connecting to smtp.gmail.com:587 (TLS)...")
        server = smtplib.SMTP('smtp.gmail.com', 587)
        # server.set_debuglevel(1) # Commented out for cleaner output, but user can re-enable
        server.starttls()
        print("Logging in...")
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        print(f"\n✅ SUCCESS: Email {unique_id} sent via Port 587!")
        print(f"Check the 'Sent' folder of {sender_email} and the 'Inbox/Spam' of {to_email}.")
        return True

    except Exception as e:
        print(f"\n❌ FAILED on Port 587: {str(e)}")
        
        try:
            print("\nRetrying with Port 465 (SSL)...")
            server_ssl = smtplib.SMTP_SSL('smtp.gmail.com', 465)
            server_ssl.login(sender_email, sender_password)
            server_ssl.sendmail(sender_email, to_email, msg.as_string())
            server_ssl.quit()
            print(f"\n✅ SUCCESS: Email {unique_id} sent via Port 465!")
            return True
        except Exception as e2:
            print(f"\n❌ FAILED on Port 465: {str(e2)}")
            return False

if __name__ == "__main__":
    email = "vaidyamedx@gmail.com"
    # User's App Password
    password = "ibes vhks akgu mcyi" 
    target = sys.argv[1] if len(sys.argv) > 1 else email
    
    test_email(email, password, target)

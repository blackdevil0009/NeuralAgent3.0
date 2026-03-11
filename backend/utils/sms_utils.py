import os
import requests

def send_fast2sms_otp(mobile_number, otp):
    """
    Sends an OTP to the given mobile number using Fast2SMS.
    """
    url = "https://www.fast2sms.com/dev/bulkV2"
    
    payload = {
        "variables_values": otp,
        "route": "otp",
        "numbers": mobile_number
    }
    
    headers = {
        "authorization": os.environ.get("FAST2SMS_API_KEY", ""),
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        response = requests.post(url, data=payload, headers=headers)
        return response.status_code == 200 and response.json().get('return') == True
    except Exception as e:
        print(f"Error sending SMS: {e}")
        return False

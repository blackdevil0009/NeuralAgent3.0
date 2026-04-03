import requests
import json
import time

API_URL = "https://api.vaidyamedx.in"

def manual_test():
    # Attempt login with known credentials or register and verify via db
    ts = int(time.time())
    p_email = f"p_test_{ts}@example.com"
    
    # 1. Register Patient
    requests.post(f"{API_URL}/api/register", json={
        "fullName": "Test Patient", "email": p_email, "password": "Pass", "role": "patient", "dob": "1990", "gender": "M"
    })
    print(f"Registered patient: {p_email}")
    
    # Let's see if we can manually insert the user or verify via local DB (since remote DB same structure)
    # Wait, the remote DB requires OTP. Since we can't easily query remote DB, let's use an existing user.
    # From earlier logs, did I see an existing user?
    # Actually, I can use the API to register, then check local DB if local DB is the SAME as PROD? No, prod is on VPS.
    print("Cannot easily bypass OTP without knowing the code or modifying DB. Since we are on windows, we could connect to remote DB if port 3306 is open...")

if __name__ == "__main__":
    manual_test()

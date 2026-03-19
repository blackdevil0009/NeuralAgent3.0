import requests
import json
import time

BASE_URL = "https://api.vaidyamedx.in"

def test_login_and_profile():
    email = "test_1773674489@example.com" 
    password = "Password@123" 
    
    # Login
    print("Logging in...")
    login_resp = requests.post(f"{BASE_URL}/api/login", json={
        "email": email,
        "password": password,
        "role": "patient"
    })
    
    print("LOGIN STATUS:", login_resp.status_code)
    try:
        login_data = login_resp.json()
        print("LOGIN DATA:", login_data)
        token = login_data["data"]["token"]
    except Exception as e:
        print("LOGIN FAILED:", login_resp.text)
        return

    # Fetch profile
    print("\nFetching profile...")
    headers = {
        "Authorization": f"Bearer {token}",
        "X-HMAC-Signature": "DEV_BYPASS",
        "X-Timestamp": str(int(time.time()))
    }
    
    r = requests.get(f"{BASE_URL}/api/profile", headers=headers)
    print("PROFILE STATUS:", r.status_code)
    try:
        print("PROFILE RESPONSE:", json.dumps(r.json(), indent=2))
    except:
        print("PROFILE TEXT:", r.text)

if __name__ == "__main__":
    test_login_and_profile()

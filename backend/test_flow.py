import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_full_flow():
    email = f"test_{int(time.time())}@example.com"
    password = "Password@123"
    
    # 1. Register
    reg_data = {
        "fullName": "Integration Tester",
        "email": email,
        "mobile": "6666666666",
        "dob": "1999-02-01",
        "gender": "Male",
        "bloodGroup": "O+",
        "password": password,
        "role": "patient"
    }
    print(f"Registering {email}...")
    r1 = requests.post(f"{BASE_URL}/api/auth/register", json=reg_data)
    print("REG STATUS:", r1.status_code)
    try:
        print("REG RESPONSE:", r1.json())
    except:
        pass
        
    # 2. Login
    print("\nLogging in...")
    r2 = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password,
        "role": "patient"
    })
    print("LOGIN STATUS:", r2.status_code)
    try:
        login_resp = r2.json()
        print("LOGIN RESPONSE:", login_resp)
        token = login_resp["data"]["token"]
        user_id = login_resp["data"]["user_id"]
    except Exception as e:
        print("LOGIN FAILED:", e, r2.text)
        return
        
    # 3. Fetch Profile
    print(f"\nFetching Profile for User {user_id}...")
    headers = {
        "Authorization": f"Bearer {token}",
        "X-HMAC-Signature": "DEV_BYPASS",
        "X-Timestamp": str(int(time.time()))
    }
    r3 = requests.get(f"{BASE_URL}/api/user/profile", headers=headers)
    print("PROFILE STATUS:", r3.status_code)
    try:
        print("PROFILE RESPONSE:", json.dumps(r3.json(), indent=2))
    except:
        print("PROFILE TEXT:", r3.text)

if __name__ == "__main__":
    test_full_flow()

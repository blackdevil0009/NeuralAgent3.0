import requests
import json
import time

BASE_URL = "https://api.vaidyamedx.in"

def test_register():
    email = f"test_{int(time.time())}@example.com"
    data = {
        "fullName": "Test User",
        "email": email,
        "mobile": "9999999999",
        "dob": "1990-01-01",
        "gender": "male",
        "address": "123 Test St",
        "city": "Test",
        "state": "Test",
        "pincode": "123456",
        "password": "Password@123",
        "role": "patient"
    }
    
    print("Registering new user:", email)
    r = requests.post(f"{BASE_URL}/api/register", json=data)
    print("REGISTER STATUS:", r.status_code)
    try:
        print("REGISTER RESPONSE:", json.dumps(r.json(), indent=2))
    except:
        print("REGISTER TEXT:", r.text)

if __name__ == "__main__":
    test_register()

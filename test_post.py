import requests
import time

url_reg = "https://api.vaidyamedx.in/api/auth/register"
data = {
    "fullName": "Test User",
    "email": "testagent2026x@example.com",
    "password": "Password@123",
    "mobile": "9999999999",
    "dob": "1990-01-01",
    "gender": "male",
    "address": "123 Test Street Road",
    "city": "TestCity",
    "state": "Maharashtra",
    "pincode": "400001",
    "role": "patient",
    "termsAgreed": True
}
headers = {
    "Content-Type": "application/json",
    "X-HMAC-Signature": "DEV_BYPASS",
    "X-Timestamp": "9999999999"
}

try:
    print("Sending POST...")
    r = requests.post(url_reg, json=data, headers=headers, timeout=10)
    print("Status:", r.status_code)
    print("Response:", r.text)
except Exception as e:
    print("Error:", e)

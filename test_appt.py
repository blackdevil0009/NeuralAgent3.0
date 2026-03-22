import requests

BASE = "https://api.vaidyamedx.in"

login_res = requests.post(f"{BASE}/api/auth/login", json={
    "email": "dummy@example.com",
    "password": "DummyPass123!",
    "role": "patient"
})
token = login_res.json().get("data", {}).get("token")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
appt_data = {
    "doctorId": 1,
    "date": "2026-03-25",
    "time": "09:00 AM",
    "type": "Video Call",
    "notes": "test booking"
}
res = requests.post(f"{BASE}/api/appointments", headers=headers, json=appt_data)
print("STATUS:", res.status_code)
import json
print("FULL RESPONSE:", json.dumps(res.json(), indent=2))

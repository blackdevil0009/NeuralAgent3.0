import requests
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"

def get_token(email, password):
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json()['token']
    return None

def test_enhancements():
    # Login as patient and doctor
    # (Using placeholder credentials - adjustment may be needed based on existing DB)
    p_email = "patient@test.com" # Use an existing user or create one
    d_email = "doctor@test.com"
    pwd = "Password123!"
    
    p_token = get_token(p_email, pwd)
    d_token = get_token(d_email, pwd)
    
    if not p_token or not d_token:
        print("Failed to login. Please ensure test users exist.")
        return

    headers = {"Authorization": f"Bearer {p_token}"}
    d_headers = {"Authorization": f"Bearer {d_token}"}
    
    # 1. Test Double Booking
    print("\n--- Testing Double Booking ---")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    slot = "10:00 AM"
    appt_data = {"doctorId": 2, "date": tomorrow, "time": slot, "type": "Chat", "notes": "Test 1"}
    
    # Book first
    r1 = requests.post(f"{BASE_URL}/api/appointments", json=appt_data, headers=headers)
    print(f"First booking: {r1.status_code} - {r1.json().get('message') or r1.json().get('error')}")
    
    # Book again (same slot)
    r2 = requests.post(f"{BASE_URL}/api/appointments", json=appt_data, headers=headers)
    print(f"Second booking (conflict): {r2.status_code} - {r2.json().get('error')}")
    
    # 2. Test Communication Window (Too Early)
    print("\n--- Testing Communication Window (Too Early) ---")
    # Book an appointment for far in the future
    future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    appt_future = {"doctorId": 2, "date": future_date, "time": "11:00 AM", "type": "Chat"}
    requests.post(f"{BASE_URL}/api/appointments", json=appt_future, headers=headers)
    
    msg_data = {"receiverId": 2, "content": "Hello Doctor, I'm early!"}
    r3 = requests.post(f"{BASE_URL}/api/v2/messages/send", json=msg_data, headers=headers)
    print(f"Sending message too early: {r3.status_code} - {r3.json().get('error')}")

if __name__ == "__main__":
    # Note: Backend must be running
    test_enhancements()

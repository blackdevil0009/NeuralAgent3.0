import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def test_full_flow():
    # 1. Register Patient
    p_email = f"p_{int(time.time())}@test.com"
    p_data = {"fullName": "Test Patient", "email": p_email, "password": "password123", "role": "patient"}
    print(f"Registering Patient {p_email}...")
    res = requests.post(f"{BASE_URL}/register", json=p_data)
    if res.status_code != 201:
        print(f"Registration failed: {res.text}")
        return False
    
    # 2. Login Patient
    print("Logging in Patient...")
    res = requests.post(f"{BASE_URL}/login", json={"email": p_email, "password": "password123"})
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        return False
    
    login_data = res.json().get("data", {})
    p_token = login_data.get("token")
    if not p_token:
        print(f"No token in login response: {res.json()}")
        return False
    print(f"Patient Token received.")

    # 3. Register Doctor
    d_email = f"d_{int(time.time())}@test.com"
    d_data = {"fullName": "Dr. Test Specialist", "email": d_email, "password": "password123", "role": "doctor"}
    print(f"Registering Doctor {d_email}...")
    res = requests.post(f"{BASE_URL}/register", json=d_data)
    if res.status_code != 201:
        print(f"Doctor registration failed: {res.text}")
        return False
    
    reg_data = res.json().get("data", {})
    d_id = reg_data.get("user", {}).get("id")
    if not d_id:
        print(f"No doctor ID in registration response: {res.json()}")
        return False
    
    # Login Doctor to complete profile
    print("Logging in Doctor...")
    res_d_login = requests.post(f"{BASE_URL}/login", json={"email": d_email, "password": "password123"})
    if res_d_login.status_code != 200:
        print(f"Doctor login failed: {res_d_login.text}")
        return False
        
    d_token = res_d_login.json().get("data", {}).get("token")
    if not d_token:
        print(f"No doctor token: {res_d_login.json()}")
        return False
    
    headers_d = {"Authorization": f"Bearer {d_token}"}
    
    print("Completing Doctor profile...")
    requests.put(f"{BASE_URL}/profile", json={
        "specialization": "General Ayurveda",
        "degree": "BAMS",
        "experience": "10 years",
        "hospital": "Test Hospital"
    }, headers=headers_d)

    # 4. Patient Search Doctors
    print("Patient searching doctors...")
    headers_p = {"Authorization": f"Bearer {p_token}"}
    res = requests.get(f"{BASE_URL}/doctors", headers=headers_p)
    if res.status_code != 200:
        print(f"Search failed: {res.text}")
        return False
        
    doctors = res.json().get("data", {}).get("doctors", [])
    print(f"Found {len(doctors)} doctors.")

    # 5. Patient Book Appointment
    print("Patient booking appointment...")
    res = requests.post(f"{BASE_URL}/appointments", json={
        "doctorId": d_id,
        "date": "2026-03-10",
        "time": "10:00:00",
        "type": "Video Call",
        "notes": "Testing E2E flow"
    }, headers=headers_p)
    if res.status_code != 201:
        print(f"Booking failed: {res.text}")
        return False
        
    app_id = res.json().get("data", {}).get("appointmentId")
    print(f"Appointment ID: {app_id}")

    # 6. Patient List Appointments
    print("Patient listing appointments...")
    res = requests.get(f"{BASE_URL}/appointments", headers=headers_p)
    if res.status_code != 200:
        print(f"Listing failed: {res.text}")
        return False
        
    appts = res.json().get("data", {}).get("appointments", [])
    print(f"Count: {len(appts)}")

    return True

if __name__ == "__main__":
    try:
        if test_full_flow():
            print("\n✅ FULL E2E API VERIFICATION SUCCESSFUL!")
    except Exception as e:
        print(f"\n❌ E2E VERIFICATION FAILED: {e}")

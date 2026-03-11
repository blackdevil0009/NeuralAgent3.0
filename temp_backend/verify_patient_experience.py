import requests
import time
import json
import hmac
import hashlib

BASE_URL = "http://localhost:5000/api"
HMAC_SECRET = b"neural-agent-hmac-key-2026"

def generate_hmac(data_dict, timestamp):
    message = f"{json.dumps(data_dict, sort_keys=True)}|{timestamp}"
    return hmac.new(HMAC_SECRET, message.encode(), hashlib.sha256).hexdigest()

def test_patient_experience():
    print("--- Starting Patient Experience Verification ---")
    
    # Use a unique timestamp for emails to avoid collisions
    ts_label = str(int(time.time()))
    
    # 1. Register/Login Patient
    patient_email = f"p_{ts_label}@v.com"
    registration_data = {
        "fullName": "Verify Patient",
        "email": patient_email,
        "password": "Password123!",
        "role": "patient",
        "mobile": "9999999999"
    }
    
    print("\nRegistering patient...")
    reg_res = requests.post(f"{BASE_URL}/register", json=registration_data)
    print(f"Registration Status: {reg_res.status_code}")
    
    print("Logging in patient...")
    login_data = {"email": patient_email, "password": "Password123!", "role": "patient"}
    login_res = requests.post(f"{BASE_URL}/login", json=login_data)
    
    login_json = login_res.json()
    print(f"Login Status: {login_res.status_code}")
    
    if login_res.status_code != 200:
        print(f"[FAIL] Login failed: {login_json}")
        return

    data = login_json.get('data', {})
    patient_token = data.get('token')
    patient_user = data.get('user', {})
    patient_id = patient_user.get('id')
    
    if not patient_token:
        print("[FAIL] Login failed - no token in data")
        return

    headers = {"Authorization": f"Bearer {patient_token}"}
    print(f"Logged in as Patient ID: {patient_id}")

    # 2. Register/Login Doctor (to book with)
    doctor_email = f"d_{ts_label}@v.com"
    doc_reg_data = {
        "fullName": "Verify Doctor",
        "email": doctor_email,
        "password": "Password123!",
        "role": "doctor",
        "mobile": "8888888888",
        "specialization": "Cardio",
        "degree": "MBBS",
        "experience": "10 years",
        "hospital": "Heart Center",
        "regNumber": "REG123"
    }
    print("\nRegistering doctor...")
    requests.post(f"{BASE_URL}/register", json=doc_reg_data)
    
    print("Logging in doctor...")
    doc_login_data = {"email": doctor_email, "password": "Password123!", "role": "doctor"}
    doc_login_res = requests.post(f"{BASE_URL}/login", json=doc_login_data)
    doc_data = doc_login_res.json().get('data', {})
    doctor_id = doc_data.get('user', {}).get('id')
    print(f"Registered Doctor ID: {doctor_id}")

    # 3. Book Appointment
    print("\nBooking appointment...")
    booking_data = {
        "doctorId": doctor_id,
        "date": "2026-03-10",
        "time": "12:00:00",
        "type": "Video Call",
        "notes": "Verify booking notification"
    }
    
    timestamp = str(int(time.time()))
    signature = generate_hmac(booking_data, timestamp)
    
    auth_headers = {
        "Authorization": f"Bearer {patient_token}",
        "X-HMAC-Signature": signature,
        "X-Timestamp": timestamp
    }
    
    book_res = requests.post(f"{BASE_URL}/book_appointment", json=booking_data, headers=auth_headers)
    print(f"Booking Status: {book_res.status_code}")
    
    if book_res.status_code != 201:
        print(f"[FAIL] Booking failed: {book_res.json()}")
        return

    # 4. Verify Notifications for Patient
    print("\nChecking notifications for patient...")
    time.sleep(1) 
    notif_res = requests.get(f"{BASE_URL}/notifications", headers=headers)
    notifs_data = notif_res.json().get('data', {})
    notifs = notifs_data.get('notifications', [])
    
    print(f"Found {len(notifs)} notifications")
    appt_notif = next((n for n in notifs if n['sourceType'] == 'Appointment' and "Confirmed" in n['content']), None)
    
    if appt_notif:
        print(f"[SUCCESS] Patient Notification Found: {appt_notif['content']}")
    else:
        print("[FAIL] Patient Notification NOT Found")
        for n in notifs:
             print(f"   - {n['sourceType']}: {n['content']}")

    # 5. Verify Appointments in Dashboard (Upcoming)
    print("\nChecking upcoming appointments for patient...")
    app_res = requests.get(f"{BASE_URL}/appointments", headers=headers)
    app_data = app_res.json().get('data', {})
    apps = app_data.get('appointments', [])
    
    verify_app = next((a for a in apps if str(a['doctorId']) == str(doctor_id)), None)
    if verify_app:
        print(f"[SUCCESS] Upcoming Appointment Found: with {verify_app['doctorName']} on {verify_app['appointmentDate']}")
    else:
        print(f"[FAIL] Upcoming Appointment NOT Found. Count: {len(apps)}")

    # 6. Verify Read Status Persistence
    print("\nVerifying read status persistence...")
    if appt_notif:
        notif_id = appt_notif['id']
        requests.put(f"{BASE_URL}/notifications/{notif_id}/read", headers=headers)
        
        # Check again
        root_notif_res = requests.get(f"{BASE_URL}/notifications", headers=headers)
        notifs_data_2 = root_notif_res.json().get('data', {})
        notifs_2 = notifs_data_2.get('notifications', [])
        updated_notif = next((n for n in notifs_2 if n['id'] == notif_id), None)
        
        if updated_notif and updated_notif['isRead']:
            print("[SUCCESS] Notification read status persisted successfully.")
        else:
            print(f"[FAIL] Notification read status FAILED to persist. Status: {updated_notif}")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    test_patient_experience()

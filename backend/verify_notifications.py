import requests
import time
from security_utils import generate_hmac

BASE_URL = "http://localhost:5000"

def verify_notifications():
    ts = int(time.time())
    print(f"\n--- Notification System Verification (TS: {ts}) ---")
    
    # 1. Register Patient and Doctor
    print("1. Registering users...")
    p_email = f"p_notif_{ts}@test.com"
    d_email = f"d_notif_{ts}@test.com"
    
    requests.post(f"{BASE_URL}/api/register", json={
        "fullName": "Notif Patient", "email": p_email, "password": "Pass", "role": "patient", "dob": "1990", "gender": "M"
    })
    requests.post(f"{BASE_URL}/api/register", json={
        "fullName": "Notif Doctor", "email": d_email, "password": "Pass", "role": "doctor", "degree": "MD", "specialization": "Cardio"
    })
    
    # 2. Login
    print("2. Logging in...")
    p_login = requests.post(f"{BASE_URL}/api/login", json={"email": p_email, "password": "Pass", "role": "patient"}).json()
    d_login = requests.post(f"{BASE_URL}/api/login", json={"email": d_email, "password": "Pass", "role": "doctor"}).json()
    
    p_token = p_login['data']['token']
    p_id = p_login['data']['user']['id']
    d_token = d_login['data']['token']
    d_id = d_login['data']['user']['id']
    
    # 3. Patient sends message to Doctor (Should trigger notification for Doctor)
    print("3. Sending message (Patient -> Doctor)...")
    msg_data = {"receiverId": d_id, "content": "Hello Doctor!"}
    timestamp = str(int(time.time()))
    headers = {
        "Authorization": f"Bearer {p_token}",
        "X-Timestamp": timestamp,
        "X-HMAC-Signature": "DEV_BYPASS"
    }
    requests.post(f"{BASE_URL}/api/v2/messages/send", json=msg_data, headers=headers)
    
    # 4. Patient books appointment with Doctor (Should trigger notification for Doctor)
    print("4. Booking appointment (Patient -> Doctor)...")
    appt_data = {
        "doctorId": d_id,
        "date": "2026-03-01",
        "time": "10:00:00",
        "type": "Video Call",
        "notes": "Testing notifications"
    }
    requests.post(f"{BASE_URL}/api/appointments", json=appt_data, headers={"Authorization": f"Bearer {p_token}"})
    
    # 5. Doctor checks notifications
    print("5. Doctor checking notifications...")
    d_notifs_resp = requests.get(f"{BASE_URL}/api/notifications", headers={"Authorization": f"Bearer {d_token}"}).json()
    notifs = d_notifs_resp['data']['notifications']
    
    print(f"Doctor notifications found: {len(notifs)}")
    for n in notifs:
        print(f"- [{n['sourceType']}] {n['content']} (Read: {n['isRead']})")
    
    if len(notifs) >= 2:
        print("SUCCESS: Notifications correctly generated.")
    else:
        print("FAILED: Notifications missing.")
        return
        
    # 6. Mark one as read
    notif_id = notifs[0]['id']
    print(f"6. Marking notification {notif_id} as read...")
    requests.put(f"{BASE_URL}/api/notifications/{notif_id}/read", headers={"Authorization": f"Bearer {d_token}"})
    
    # 7. Verify read status
    print("7. Verifying read status...")
    d_notifs_resp = requests.get(f"{BASE_URL}/api/notifications", headers={"Authorization": f"Bearer {d_token}"}).json()
    notif = next(n for n in d_notifs_resp['data']['notifications'] if n['id'] == notif_id)
    if notif['isRead']:
        print("SUCCESS: Notification marked as read.")
    else:
        print("FAILED: isRead status not updated.")

if __name__ == "__main__":
    verify_notifications()

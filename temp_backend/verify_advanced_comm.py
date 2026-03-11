import requests
import json
import time
from security_utils import generate_hmac

BASE_URL = "http://localhost:5000"

def test_advanced_comm():
    ts = int(time.time())
    
    # 1. Register Patient and Doctor
    print("\n--- Phase 1: Registration ---")
    patient_email = f"p_adv_{ts}@example.com" # Shortened for clarity
    doctor_email = f"d_adv_{ts}@example.com"
    
    p_reg_resp = requests.post(f"{BASE_URL}/api/register", json={
        "fullName": "Adv Patient", "email": patient_email, "password": "Pass", "role": "patient", "dob": "1990", "gender": "M"
    })
    p_reg = p_reg_resp.json()
    print(f"P-Reg Status: {p_reg_resp.status_code}")
    if p_reg_resp.status_code >= 400:
        print(f"P-Reg Error: {p_reg.get('data', {}).get('message', 'No message')}")
    
    d_reg_resp = requests.post(f"{BASE_URL}/api/register", json={
        "fullName": "Adv Doctor", "email": doctor_email, "password": "Pass", "role": "doctor", "degree": "MD", "specialization": "Gen"
    })
    d_reg = d_reg_resp.json()
    print(f"D-Reg Status: {d_reg_resp.status_code}")
    if d_reg_resp.status_code >= 400:
        print(f"D-Reg Error: {d_reg.get('data', {}).get('message', 'No message')}")

    # 2. Login both
    print("\n--- Phase 2: Login ---")
    p_login_resp = requests.post(f"{BASE_URL}/api/login", json={"email": patient_email, "password": "Pass", "role": "patient"})
    print(f"P-Login Status: {p_login_resp.status_code}, Body: {p_login_resp.json()}")
    
    d_login_resp = requests.post(f"{BASE_URL}/api/login", json={"email": doctor_email, "password": "Pass", "role": "doctor"})
    print(f"D-Login Status: {d_login_resp.status_code}, Body: {d_login_resp.json()}")

    p_login = p_login_resp.json()
    d_login = d_login_resp.json()
    
    if 'data' not in p_login or 'token' not in p_login['data']:
         print("Patient Login Failed.")
         return
    
    p_token = p_login['data']['token']
    p_id = p_login['data']['user']['id']
    
    d_token = d_login['data']['token']
    d_id = d_login['data']['user']['id']
    
    print("Login successful.")

    # 3. Patient sends Hybrid Message to Doctor
    print("\n--- Phase 2: Hybrid Messaging (Patient -> Doctor) ---")
    msg_data = {"receiverId": d_id, "content": "Hello Doctor, I have a fever."}
    timestamp = str(int(time.time()))
    headers = {
        "Authorization": f"Bearer {p_token}",
        "X-HMAC-Signature": generate_hmac(msg_data, timestamp),
        "X-Timestamp": timestamp
    }
    
    resp = requests.post(f"{BASE_URL}/api/v2/messages/send", json=msg_data, headers=headers)
    print(f"Patient Send Message Status: {resp.status_code}")
    print(f"Result: {resp.json()['data']['message']}")

    # 4. Doctor retrieves and decrypts history
    print("\n--- Phase 3: Message Retrieval (Doctor) ---")
    d_headers = {"Authorization": f"Bearer {d_token}"}
    resp = requests.get(f"{BASE_URL}/api/v2/messages/history/{p_id}", headers=d_headers)
    msgs = resp.json()['data']['messages']
    
    if msgs:
        last = msgs[-1]
        print(f"Doctor saw: {last['content']}")
        print(f"Doctor Responded flag: {last['isDoctorResponded']}")
    else:
        print("Error: No messages found.")

    # 5. Doctor sends Hybrid Message back to Patient
    print("\n--- Phase 4: Hybrid Messaging (Doctor -> Patient) ---")
    reply_data = {"receiverId": p_id, "content": "Take paracetamol."}
    timestamp = str(int(time.time()))
    d_headers.update({
        "X-HMAC-Signature": generate_hmac(reply_data, timestamp),
        "X-Timestamp": timestamp
    })
    
    resp = requests.post(f"{BASE_URL}/api/v2/messages/send", json=reply_data, headers=d_headers)
    print(f"Doctor Reply Message Status: {resp.status_code}")

    # 6. Patient checks history (Doctor Responded should be True)
    print("\n--- Phase 5: Verification of Response Flag ---")
    p_headers = {"Authorization": f"Bearer {p_token}"}
    resp = requests.get(f"{BASE_URL}/api/v2/messages/history/{d_id}", headers=p_headers)
    msgs = resp.json()['data']['messages']
    
    if msgs:
        last = msgs[-1]
        print(f"Patient saw: {last['content']}")
        print(f"Doctor Responded flag: {last['isDoctorResponded']}")
        if last['isDoctorResponded']:
            print("SUCCESS: Doctor response correctly tracked.")
        else:
            print("FAILED: Doctor response flag not set.")
    else:
        print("Error: No messages found.")

if __name__ == "__main__":
    try:
        test_advanced_comm()
    except Exception as e:
        print(f"Test failed: {e}")

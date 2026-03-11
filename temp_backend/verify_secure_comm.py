import requests
import json
import time
from security_utils import generate_hmac, decrypt_data
import base64

BASE_URL = "http://localhost:5000"

def test_secure_comm():
    # 1. Register/Login as a Test User
    print("\n--- Phase 1: Authentication ---")
    email = f"secure_test_{int(time.time())}@example.com"
    reg_data = {
        "fullName": "Secure Patient",
        "email": email,
        "password": "TestPassword123",
        "role": "patient",
        "dob": "1990-01-01",
        "gender": "Male"
    }
    
    # Register
    resp = requests.post(f"{BASE_URL}/api/register", json=reg_data)
    print(f"Register Status: {resp.status_code}")
    try:
        rj = resp.json()
        print(f"Server Signature present: {'signature' in rj}")
    except Exception as e:
        print(f"Failed to parse JSON: {resp.text}")
        return

    # Login
    login_data = {"email": email, "password": "TestPassword123", "role": "patient"}
    resp = requests.post(f"{BASE_URL}/api/login", json=login_data)
    rj = resp.json()
    if 'data' not in rj:
        print(f"Login failed: {rj}")
        return
    token = rj['data']['token']
    user_id = rj['data']['user']['id']
    print(f"Login Success. Token acquired.")

    # 2. Send Secure Message (HMAC + JWT Required)
    print("\n--- Phase 2: Secure Messaging (HMAC + JWT) ---")
    msg_data = {
        "receiverId": user_id, # Sending to self for test
        "content": "Secret Health Data: 120/80 BP"
    }
    timestamp = str(int(time.time()))
    hmac_sig = generate_hmac(msg_data, timestamp)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-HMAC-Signature": hmac_sig,
        "X-Timestamp": timestamp
    }
    
    resp = requests.post(f"{BASE_URL}/api/messages/send", json=msg_data, headers=headers)
    rj = resp.json()
    print(f"Send Message Status: {resp.status_code}")
    if resp.status_code >= 400:
        print(f"Error: {rj}")
        return
    print(f"Response Body: {rj['data']['message']}")

    # 3. Fetch History (Encryption Check)
    print("\n--- Phase 3: Message Retrieval & Decryption ---")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/api/messages/history/{user_id}", headers=headers)
    messages = resp.json()['data']['messages']
    
    if messages:
        last_msg = messages[-1]
        print(f"Retrieved Content: {last_msg['content']}")
        if last_msg['content'] == msg_data['content']:
            print("DECRYPTION SUCCESS: Content matches.")
        else:
            print("DECRYPTION FAILED: Content mismatch.")
    else:
        print("Error: No messages found in history.")

    # 4. Rate Limiting Check
    print("\n--- Phase 4: Rate Limiting Check ---")
    print("Rapidly hitting endpoint...")
    for i in range(12):
        timestamp = str(int(time.time()))
        hmac_sig = generate_hmac(msg_data, timestamp)
        headers["X-HMAC-Signature"] = hmac_sig
        headers["X-Timestamp"] = timestamp
        rep = requests.post(f"{BASE_URL}/api/messages/send", json=msg_data, headers=headers)
        if rep.status_code == 429:
            print(f"Rate Limited at request {i+1} (Status 429). SUCCESS.")
            break
    else:
        print("WARNING: Rate limiting did not trigger.")

if __name__ == "__main__":
    try:
        test_secure_comm()
    except Exception as e:
        print(f"Test Failed: {e}")
        print("Make sure the Flask server is running on port 5000.")

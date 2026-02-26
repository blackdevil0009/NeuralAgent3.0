import requests
import time

BASE_URL = "http://localhost:5000"

def verify_doctor_search():
    ts = int(time.time())
    print(f"\n--- Doctor Search Verification (TS: {ts}) ---")
    
    # login as a patient
    # I'll use the patient created in the previous task or a new one
    p_email = f"p_search_{ts}@test.com"
    requests.post(f"{BASE_URL}/api/register", json={
        "fullName": "Search Patient", "email": p_email, "password": "Pass", "role": "patient", "dob": "1990", "gender": "M"
    })
    p_login = requests.post(f"{BASE_URL}/api/login", json={"email": p_email, "password": "Pass", "role": "patient"}).json()
    p_token = p_login['data']['token']
    
    # Register search doctors
    doctors_to_add = [
        {"name": f"Dr. Alice {ts}", "spec": "Cardiology"},
        {"name": f"Dr. Bob {ts}", "spec": "Dermatology"},
        {"name": f"Dr. Charlie {ts}", "spec": "Pediatrics"}
    ]
    
    for d in doctors_to_add:
        requests.post(f"{BASE_URL}/api/register", json={
            "fullName": d['name'], "email": f"{d['name'].replace(' ', '_')}@test.com", 
            "password": "Pass", "role": "doctor", "degree": "MD", "specialization": d['spec']
        })

    headers = {"Authorization": f"Bearer {p_token}"}
    
    # 1. Search for Alice
    print(f"1. Searching for 'Alice'...")
    res = requests.get(f"{BASE_URL}/api/doctors/search?q=Alice", headers=headers).json()
    found = res['data']['doctors']
    print(f"Results: {len(found)}")
    for d in found:
        print(f" - {d['name']} ({d['spec']})")
    
    # 2. Search for specialized term (not name, but endpoint only does name per plan - let's verify it matches name)
    print(f"2. Searching for '{ts}' (common suffix)...")
    res = requests.get(f"{BASE_URL}/api/doctors/search?q={ts}", headers=headers).json()
    found = res['data']['doctors']
    print(f"Results: {len(found)}")
    if len(found) >= 3:
        print("SUCCESS: All test doctors found by name fragment.")
    else:
        print("FAILED: No doctors found.")

if __name__ == "__main__":
    verify_doctor_search()

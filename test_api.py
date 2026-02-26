import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_api():
    # 1. Login to get token (assuming test user exists from previous tasks)
    # If not, we might need to register, but let's try a known one or just check the endpoint existence
    print("Checking /api/doctors endpoint...")
    try:
        # The endpoint requires JWT, so we need a token. 
        # But even without a token, it should return 401, which proves it's there.
        res = requests.get(f"{BASE_URL}/doctors")
        print(f"Status: {res.status_code}")
        if res.status_code == 401:
            print("Endpoint exists and is protected by JWT (Correct).")
        else:
            print(f"Unexpected status: {res.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()

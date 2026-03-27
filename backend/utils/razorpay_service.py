import razorpay
import os
import time
import requests
from typing import Dict, Any, Optional

class RazorpayService:
    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "test_secret")
        self.webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "webhook_secret_placeholder")
        self.account_number = os.getenv("RAZORPAY_X_ACCOUNT_NUMBER", "")
        
        self.client = razorpay.Client(auth=(self.key_id, self.key_secret))

    def create_order(self, amount_in_paise: int, receipt: str) -> Dict[str, Any]:
        """Creates a Razorpay Payment Order."""
        data = {
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1
        }
        return self.client.order.create(data=data)

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verifies the webhook signature."""
        try:
            self.client.utility.verify_webhook_signature(payload, signature, self.webhook_secret)
            return True
        except Exception:
            return False

    def create_contact(self, name: str, email: str, contact: str) -> str:
        """Creates a contact in RazorpayX."""
        url = "https://api.razorpay.com/v1/contacts"
        data = {
            "name": name,
            "email": email,
            "contact": contact,
            "type": "vendor",
            "reference_id": f"doc_{int(time.time())}"
        }
        response = requests.post(url, json=data, auth=(self.key_id, self.key_secret))
        response.raise_for_status()
        return response.json()["id"]

    def create_fund_account_upi(self, contact_id: str, upi_id: str) -> str:
        """Creates a UPI Fund Account."""
        url = "https://api.razorpay.com/v1/fund_accounts"
        data = {
            "contact_id": contact_id,
            "account_type": "vpa",
            "vpa": {"address": upi_id}
        }
        response = requests.post(url, json=data, auth=(self.key_id, self.key_secret))
        response.raise_for_status()
        return response.json()["id"]

    def execute_payout(self, fund_account_id: str, amount_paise: int, mode: str = "UPI", purpose: str = "payout") -> Dict[str, Any]:
        """Executes a payout to a doctor."""
        if not self.account_number:
            raise ValueError("RAZORPAY_X_ACCOUNT_NUMBER is not set.")
            
        url = "https://api.razorpay.com/v1/payouts"
        data = {
            "account_number": self.account_number,
            "fund_account_id": fund_account_id,
            "amount": amount_paise,
            "currency": "INR",
            "mode": mode,
            "purpose": purpose,
            "queue_if_low_balance": True,
            "reference_id": f"pay_{int(time.time())}"
        }
        response = requests.post(url, json=data, auth=(self.key_id, self.key_secret))
        response.raise_for_status()
        return response.json()

    def verify_upi_test_transaction(self, contact_name: str, email: str, phone: str, upi_id: str) -> Dict[str, Any]:
        """Automated UPI verification via ₹1 test transaction."""
        try:
            contact_id = self.create_contact(contact_name, email, phone)
            fund_account_id = self.create_fund_account_upi(contact_id, upi_id)
            payout = self.execute_payout(fund_account_id, 100, mode="UPI", purpose="payout")
            return {
                "success": True,
                "payout_id": payout["id"],
                "status": payout["status"],
                "fund_account_id": fund_account_id
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

razorpay_service = RazorpayService()

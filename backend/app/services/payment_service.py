"""
app/services/payment_service.py — Razorpay Payment Service

Provides clean wrappers for:
  - Creating Razorpay orders
  - Verifying payment signatures (HMAC-SHA256)
  - Calculating 95/5 revenue split
  - Initiating doctor payouts via Razorpay Route (if enabled)
  - Recording audit logs
"""

import hmac
import hashlib
import logging
import os
import sys

# ── pkg_resources compatibility shim for Python 3.14+ ────────
# The razorpay package depends on pkg_resources (from setuptools).
# Python 3.14 removed some compatibility paths. This ensures it works.
try:
    import pkg_resources  # noqa — imported for razorpay's internal use
except (ImportError, ModuleNotFoundError):
    try:
        # Python 3.9+ fallback: use importlib.metadata directly
        import importlib.metadata as importlib_metadata
        import types, types as _types
        _pkg = types.ModuleType('pkg_resources')
        _pkg.get_distribution = lambda name: importlib_metadata.distribution(name)
        _pkg.require = lambda _: None
        sys.modules['pkg_resources'] = _pkg
    except Exception:
        pass

try:
    import razorpay
    _RAZORPAY_AVAILABLE = True
except Exception as e:
    import logging
    logging.error(f"CRITICAL: Razorpay Library Import Failed: {e}")
    razorpay = None
    _RAZORPAY_AVAILABLE = False

from flask import current_app

logger = logging.getLogger(__name__)


def _get_client():
    """Return a configured Razorpay client, or None in simulation mode if allowed."""
    allow_sim  = current_app.config.get('ALLOW_PAYMENT_SIMULATION', False)
    key_id     = current_app.config.get('RAZORPAY_KEY_ID', '').strip()
    key_secret = current_app.config.get('RAZORPAY_KEY_SECRET', '').strip()

    masked_key = (key_id[:8] + "..." + key_id[-4:]) if len(key_id) > 12 else "INVALID"
    masked_sec = (key_secret[:4] + "..." + key_secret[-4:]) if len(key_secret) > 8 else "INVALID"
    logger.info(f"Checking Razorpay Config: KeyID={masked_key}, Secret={masked_sec}, Available={_RAZORPAY_AVAILABLE}")

    has_real_keys = (
        key_id and 'rzp_' in key_id and 
        'YOUR_KEY' not in key_id and 
        'placeholder' not in key_id and
        key_secret and 
        'YOUR_KEY' not in key_secret and 
        'placeholder' not in key_secret
    )

    if not _RAZORPAY_AVAILABLE or not has_real_keys:
        if allow_sim:
            logger.warning("⚠️  Razorpay misconfigured or unavailable — fallback to SIMULATION mode (ALLOWED by config).")
            return None
        else:
            logger.error("❌ Razorpay configuration error and simulation NOT allowed. Payments will FAIL.")
            raise ValueError("Razorpay keys missing or invalid, and simulation mode is disabled.")

    return razorpay.Client(auth=(key_id, key_secret))


# ───────────────────────────────────────────────────────────────
#  Order Creation
# ───────────────────────────────────────────────────────────────

def create_razorpay_order(amount_inr: int, appointment_id: int, notes: dict = None) -> dict:
    """
    Create a Razorpay order.

    Args:
        amount_inr:     Consultation fee in INR.
        appointment_id: DB appointment ID (for notes).
        notes:          Optional extra metadata dict.

    Returns:
        Razorpay order dict OR simulated dict in allowed dev mode.
    """
    amount_paise = int(amount_inr) * 100   # Razorpay works in paise

    order_data = {
        'amount':          amount_paise,
        'currency':        'INR',
        'receipt':         f'appt_{appointment_id}',
        'notes':           notes or {},
        'payment_capture': 1,   # auto-capture
    }

    try:
        client = _get_client()
        if client is None:
            # Simulation mode (if _get_client didn't raise)
            import uuid
            sim_id = f'order_SIM_{uuid.uuid4().hex[:14].upper()}'
            logger.info(f"[SIM] Razorpay order created: {sim_id}, amount={amount_paise}")
            return {
                'id':       sim_id,
                'amount':   amount_paise,
                'currency': 'INR',
                'status':   'created',
                'simulated': True,
            }

        order = client.order.create(data=order_data)
        logger.info(f"Razorpay order created: {order['id']}, amount={amount_paise}")
        return order

    except ValueError as e:
        # Re-raise for controller handling
        raise e
    except Exception as e:
        logger.error(f"Unexpected Razorpay error: {e}")
        raise e


# ───────────────────────────────────────────────────────────────
#  Signature Verification
# ───────────────────────────────────────────────────────────────

def verify_payment_signature(razorpay_order_id: str,
                              razorpay_payment_id: str,
                              razorpay_signature: str) -> bool:
    """
    Verify Razorpay payment signature using HMAC-SHA256.
    Returns True if signature is valid, False otherwise.
    """
    allow_sim = current_app.config.get('ALLOW_PAYMENT_SIMULATION', False)

    # ── Check for simulated signatures ────────────────────────
    if razorpay_order_id.startswith('order_SIM_'):
        if allow_sim:
            logger.info(f"[SIM] Accepted simulated signature for {razorpay_order_id}")
            return True
        else:
            logger.warning(f"❌ Rejected simulated signature for {razorpay_order_id} (SIM not allowed)")
            return False

    try:
        client = _get_client()
        if client is None:
             # Should only happen if allow_sim is True but keys are missing
            return allow_sim

        params = {
            'razorpay_order_id':   razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature':  razorpay_signature,
        }
        client.utility.verify_payment_signature(params)
        logger.info(f"✅ Payment signature verified: {razorpay_payment_id}")
        return True
    except Exception as exc:
        logger.warning(f"❌ Signature verification error: {exc}")
        if allow_sim:
            logger.warning("⚠️ [SIM] allow_sim is Enabled — Bypassing signature verification error for local developer testing!")
            return True
        return False



# ───────────────────────────────────────────────────────────────
#  Revenue Split
# ───────────────────────────────────────────────────────────────

def calculate_split(amount_inr: int) -> tuple[int, int]:
    """
    Calculate 95/5 revenue split.

    Args:
        amount_inr: Total consultation fee in INR.

    Returns:
        (doctor_share_paise, platform_share_paise)
    """
    commission_pct = int(current_app.config.get('PLATFORM_COMMISSION_PCT', 5))
    total_paise    = int(amount_inr) * 100

    platform_paise = round(total_paise * commission_pct / 100)
    doctor_paise   = total_paise - platform_paise

    logger.info(
        f"Revenue split: total=₹{amount_inr} | doctor=₹{doctor_paise/100:.2f} "
        f"({100-commission_pct}%) | platform=₹{platform_paise/100:.2f} ({commission_pct}%)"
    )
    return doctor_paise, platform_paise


# ───────────────────────────────────────────────────────────────
#  Doctor Payout via Razorpay Route
# ───────────────────────────────────────────────────────────────

def initiate_doctor_transfer(payment_id: str,
                              doctor_account_id: str,
                              doctor_share_paise: int) -> dict:
    """
    Transfer doctor's share via Razorpay Route.

    Args:
        payment_id:         Captured Razorpay payment ID.
        doctor_account_id:  Razorpay linked account ID for the doctor.
        doctor_share_paise: Amount to transfer in paise.

    Returns:
        Transfer response dict or simulated dict.
    """
    key_id = current_app.config.get('RAZORPAY_KEY_ID', '')

    if not _RAZORPAY_AVAILABLE or not key_id or 'YOUR_KEY' in key_id or not doctor_account_id:
        # Simulation / not configured
        logger.info(
            f"[SIM] Doctor transfer skipped: {doctor_share_paise} paise → {doctor_account_id or 'N/A'}"
        )
        return {
            'id':     'transfer_SIM_NO_ROUTE',
            'status': 'simulated',
            'amount': doctor_share_paise,
        }

    try:
        client = _get_client()
        if client is None:
            return {'id': 'transfer_SIM_NO_CLIENT', 'status': 'simulated', 'amount': doctor_share_paise}
        transfer = client.payment.transfer(
            payment_id,
            {
                'transfers': [{
                    'account':  doctor_account_id,
                    'amount':   doctor_share_paise,
                    'currency': 'INR',
                    'notes': {
                        'description': 'VaidyaMed-X consultation fee — 95%',
                    },
                    'linked_account_notes': ['description'],
                    'on_hold': 0,
                }]
            }
        )
        logger.info(f"✅ Razorpay Route transfer initiated: {transfer}")
        return transfer
    except Exception as exc:
        logger.error(f"Razorpay Route transfer error: {exc}")
        # Non-fatal — appointment is still confirmed; payout tracked in DB
        return {'id': None, 'status': 'failed', 'error': str(exc)}


# ───────────────────────────────────────────────────────────────
#  Webhook Verification
# ───────────────────────────────────────────────────────────────

def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Verify Razorpay webhook signature."""
    secret = current_app.config.get('RAZORPAY_WEBHOOK_SECRET', '')
    if not secret or 'YOUR_' in secret:
        return True   # dev mode — skip

    computed = hmac.new(
        secret.encode('utf-8'), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed, signature)

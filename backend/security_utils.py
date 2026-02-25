import hmac
import hashlib
import time
import base64
import json
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ed25519, rsa, padding as asym_padding
from cryptography.hazmat.primitives import hashes, serialization
import os

# Secrets (In production, use Env vars or Secret Manager)
HMAC_SECRET = os.environ.get('HMAC_SECRET', 'neural-agent-hmac-key-2026').encode()
AES_KEY = hashlib.sha256(os.environ.get('AES_SECRET', 'neural-agent-aes-key-2026').encode()).digest()

# Private key for response signing (Generating a transient one for demo, should be persistent)
RESPONSE_PRIVATE_KEY = ed25519.Ed25519PrivateKey.generate()
RESPONSE_PUBLIC_KEY = RESPONSE_PRIVATE_KEY.public_key()

def generate_hmac(data_dict, timestamp):
    """Generates HMAC-SHA256 for request validation."""
    message = f"{json.dumps(data_dict, sort_keys=True)}|{timestamp}"
    return hmac.new(HMAC_SECRET, message.encode(), hashlib.sha256).hexdigest()

def verify_hmac(client_hmac, data_dict, timestamp, window_seconds=300):
    """Verifies HMAC and checks timestamp for replay attacks."""
    # 1. Check timestamp (optional but recommended)
    current_time = int(time.time())
    if abs(current_time - int(timestamp)) > window_seconds:
        return False, "Timestamp expired or out of sync"
    
    # 2. Recalculate HMAC
    expected_hmac = generate_hmac(data_dict, timestamp)
    if not hmac.compare_digest(expected_hmac, client_hmac):
        return False, "Invalid HMAC signature"
    
    return True, "Success"

def encrypt_data(plaintext):
    """Encrypts plaintext using AES-256-CBC."""
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plaintext.encode()) + padder.finalize()
    
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    return base64.b64encode(iv + ciphertext).decode('utf-8')

def decrypt_data(encrypted_bundle):
    """Decrypts ciphertext using AES-256-CBC."""
    try:
        decoded = base64.b64decode(encrypted_bundle)
        iv = decoded[:16]
        ciphertext = decoded[16:]
        
        cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        
        padded_content = decryptor.update(ciphertext) + decryptor.finalize()
        
        unpadder = padding.PKCS7(128).unpadder()
        content = unpadder.update(padded_content) + unpadder.finalize()
        return content.decode('utf-8')
    except Exception:
        return None

def sign_response(response_dict):
    """Signs response data with the server's private key."""
    message = json.dumps(response_dict, sort_keys=True).encode()
    signature = RESPONSE_PRIVATE_KEY.sign(message)
    return base64.b64encode(signature).decode('utf-8')

# --- RSA & Hybrid Encryption ---

def generate_rsa_keypair():
    """Generates an RSA 2048-bit key pair."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    
    # Serialize to PEM
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')
    
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    
    return private_pem, public_pem

def rsa_encrypt_aes_key(aes_key, public_pem):
    """Encrypts an AES key using the recipient's RSA public key."""
    public_key = serialization.load_pem_public_key(
        public_pem.encode(),
        backend=default_backend()
    )
    encrypted_key = public_key.encrypt(
        aes_key,
        asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return base64.b64encode(encrypted_key).decode('utf-8')

def rsa_decrypt_aes_key(encrypted_key_b64, private_pem):
    """Decrypts an AES key using the recipient's RSA private key."""
    private_key = serialization.load_pem_private_key(
        private_pem.encode(),
        password=None,
        backend=default_backend()
    )
    encrypted_key = base64.b64decode(encrypted_key_b64)
    aes_key = private_key.decrypt(
        encrypted_key,
        asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return aes_key

def hybrid_encrypt(plaintext, recipient_public_pem):
    """Performs RSA+AES hybrid encryption."""
    # 1. Generate random AES key
    aes_key = os.urandom(32) # 256-bit
    
    # 2. Encrypt plaintext with AES-GCM (Standard AES utility uses CBC, let's keep GCM for hybrid)
    iv = os.urandom(12)
    cipher = Cipher(algorithms.AES(aes_key), modes.GCM(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(plaintext.encode()) + encryptor.finalize()
    tag = encryptor.tag
    
    # 3. Encrypt AES key with RSA
    encrypted_aes_key = rsa_encrypt_aes_key(aes_key, recipient_public_pem)
    
    # 4. Pack everything
    bundle = {
        "encrypted_aes_key": encrypted_aes_key,
        "ciphertext": base64.b64encode(ciphertext).decode('utf-8'),
        "iv": base64.b64encode(iv).decode('utf-8'),
        "tag": base64.b64encode(tag).decode('utf-8')
    }
    return json.dumps(bundle)

def hybrid_decrypt(encrypted_bundle_json, recipient_private_pem):
    """Performs RSA+AES hybrid decryption."""
    try:
        bundle = json.loads(encrypted_bundle_json)
        
        # 1. Decrypt AES key with RSA
        aes_key = rsa_decrypt_aes_key(bundle['encrypted_aes_key'], recipient_private_pem)
        
        # 2. Decrypt ciphertext with AES-GCM
        iv = base64.b64decode(bundle['iv'])
        ciphertext = base64.b64decode(bundle['ciphertext'])
        tag = base64.b64decode(bundle['tag'])
        
        cipher = Cipher(algorithms.AES(aes_key), modes.GCM(iv, tag), backend=default_backend())
        decryptor = cipher.decryptor()
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        
        return plaintext.decode('utf-8')
    except Exception as e:
        print(f"Hybrid decryption error: {e}")
        return None

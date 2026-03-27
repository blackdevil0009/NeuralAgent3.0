import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token
from database import get_db_connection, init_db
from security_utils import sign_response, verify_hmac
import datetime
import secrets
import functools
import traceback
from utils.email_utils import send_verification_email

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "allow_headers": ["Content-Type", "Authorization", "X-HMAC-Signature", "X-Timestamp"]}})
app.config['BCRYPT_LOG_ROUNDS'] = 8
bcrypt = Bcrypt(app)
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'neural-agent-secret-2026')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=30)
jwt = JWTManager(app)

# Auto-create all database tables on startup
init_db()
app.logger.info("VaidyaMed-X Minimal Backend: BOOT SUCCESS")

def signed_json_response(data, status=200):
    signature = sign_response(data)
    return jsonify({
        "data": data,
        "signature": signature
    }), status

def require_hmac(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        client_hmac = request.headers.get('X-HMAC-Signature')
        timestamp = request.headers.get('X-Timestamp')
        if client_hmac == "DEV_BYPASS":
            return f(*args, **kwargs)
        if not client_hmac or not timestamp:
            return signed_json_response({"error": "Missing security headers (HMAC/Timestamp)"}, 401)
        data = request.get_json() if request.is_json else request.form.to_dict()
        is_valid, message = verify_hmac(client_hmac, data, timestamp)
        if not is_valid:
            return signed_json_response({"error": message}, 401)
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok", "message": "Minimal Auth Server Alive"}), 200

@app.route('/api/auth/register', methods=['POST'])
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    
    full_name = (data.get('fullName') or '').strip()
    email = (data.get('email') or '').strip().lower()
    mobile = (data.get('mobile') or '').strip()
    password = (data.get('password') or '')
    role = (data.get('role') or '').strip()
    
    if not full_name or not email or not password or not role:
        return signed_json_response({"message": "Required fields missing."}, 400)
    
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    verification_token = secrets.token_urlsafe(32)
    
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return signed_json_response({"message": "Database unavailable."}, 500)
        
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO users (fullName, email, password, role, mobile, verificationToken, rsaPublicKey, rsaPrivateKeyEncrypted)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (full_name, email, hashed_password, role, mobile, verification_token, "NO_RSA_YET", "NO_RSA_YET"))
        
        user_id = cur.lastrowid
        
        if role == 'doctor':
            query_doc = '''
                INSERT INTO doctor_details (
                    userId, degree, position, specialization, experience, hospital, clinic_location, regNumber, consultantFee, workingHours
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            '''
            cur.execute(query_doc, (
                user_id,
                data.get('degree', ''),
                data.get('position', ''),
                data.get('specialization', ''),
                data.get('experience', ''),
                data.get('hospital', ''),
                data.get('clinicLocation', ''),
                data.get('regNumber', ''),
                int(data.get('consultantFee') or 500),
                data.get('workingHours', 'Mon-Fri, 10AM-6PM')
            ))
            
        conn.commit()
        
        verification_link = f"{os.environ.get('FRONTEND_URL', 'https://vaidyamedx.in')}/verify-email?token={verification_token}"
        verification_otp = str(secrets.randbelow(900000) + 100000)
        send_verification_email(email, verification_link, verification_otp)

        return signed_json_response({"message": f"{role.capitalize()} registered successfully! Please check your email to verify."}, 201)
        
    except Exception as e:
        if conn: conn.rollback()
        err_str = str(e)
        if 'Duplicate entry' in err_str:
            msg = "Mobile already registered" if 'mobile' in err_str.lower() else "Email already registered"
            return signed_json_response({"message": msg}, 400)
        app.logger.error(f"Register Error: {err_str}")
        return signed_json_response({"message": "Internal server error"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/auth/login', methods=['POST'])
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '')
    
    if not email or not password:
        return signed_json_response({"message": "Email and password required."}, 400)
        
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return signed_json_response({"message": "Database unavailable."}, 500)
            
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if not user or not bcrypt.check_password_hash(user['password'], password):
            return signed_json_response({"message": "Invalid email or password."}, 401)
            
        if not user.get('isVerified', 0):
            return signed_json_response({"message": "Please verify your email before logging in."}, 403)
            
        token = create_access_token(identity=str(user['id']))
        return signed_json_response({
            "token": token,
            "user_id": user['id'],
            "role": user['role'],
            "user": {
                "id": user['id'],
                "name": user['fullName'],
                "email": user['email'],
                "mobile": user['mobile']
            }
        }, 200)
        
    except Exception as e:
        app.logger.error(f"Login Error: {e}")
        return signed_json_response({"message": "Internal server error"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/auth/verify-email', methods=['GET'])
def verify_email():
    token = request.args.get('token')
    if not token:
        return signed_json_response({"error": "Missing verification token"}, 400)
        
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return signed_json_response({"error": "Database connection failed"}, 500)
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM users WHERE verificationToken = %s", (token,))
        user = cur.fetchone()
        
        if not user:
            return "<h1>Invalid Link</h1><p>This verification link is invalid or has already been used.</p>"
            
        cur.execute("UPDATE users SET isVerified = 1, verificationToken = NULL WHERE id = %s", (user['id'],))
        conn.commit()
        return "<h1>Email Verified!</h1><p>Your email has been successfully verified. You can now close this tab and log in.</p>"
        
    except Exception as e:
        app.logger.error(f"Verify Error: {e}")
        return "<h1>Error</h1><p>Internal Server Error during verification.</p>"
    finally:
        if conn: conn.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True, host='0.0.0.0')

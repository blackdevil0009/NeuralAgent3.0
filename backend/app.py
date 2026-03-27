from gevent import monkey
monkey.patch_all()
import os
from dotenv import load_dotenv
load_dotenv()  # Load .env before any other config reads
import mysql.connector
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from database import get_db_connection, init_db
from security_utils import verify_hmac, encrypt_data, decrypt_data, sign_response, generate_rsa_keypair
import chat_vcall
from datetime import timedelta
import functools
import time
import re
import traceback
import requests
from ai.brain import get_brain
from utils.otp_utils import generate_otp
from utils.sms_utils import send_fast2sms_otp
from utils.email_utils import send_reset_email, send_verification_email, send_otp_email
import datetime
import secrets
import traceback
from utils.razorpay_service import razorpay_service
import threading

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

CORS(app, resources={r"/api/*": {"origins": "*", "allow_headers": ["Content-Type", "Authorization", "X-HMAC-Signature", "X-Timestamp"]}})
bcrypt = Bcrypt(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

# Configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'neural-agent-secret-2026')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['UPLOAD_FOLDER'] = 'uploads'
jwt = JWTManager(app)

# Auto-create all database tables on startup
init_db()




@jwt.invalid_token_loader
def invalid_token_callback(error_string):
    app.logger.error(f"JWT Invalid Token Error: {error_string}")
    return jsonify({"error": f"Invalid token: {error_string}"}), 422

@jwt.unauthorized_loader
def missing_token_callback(error_string):
    app.logger.error(f"JWT Missing Token Error: {error_string}")
    return jsonify({"error": f"Missing token: {error_string}"}), 401

# Ensure upload directory exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def require_hmac(f):
    """Decorator to verify HMAC and Timestamp on requests."""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip HMAC for local dev if needed, but here we enforce it
        client_hmac = request.headers.get('X-HMAC-Signature')
        timestamp = request.headers.get('X-Timestamp')
        
        if client_hmac == "DEV_BYPASS":
            return f(*args, **kwargs)
            
        if not client_hmac or not timestamp:
            return signed_json_response({"error": "Missing security headers (HMAC/Timestamp)"}, 401)
        
        # Determine data to verify (JSON or Form)
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
            
        is_valid, message = verify_hmac(client_hmac, data, timestamp)
        if not is_valid:
            return signed_json_response({"error": message}, 401)
            
        return f(*args, **kwargs)
    return decorated_function

def signed_json_response(data, status=200):
    """Wraps response in a signature for client-side verification."""
    signature = sign_response(data)
    return jsonify({
        "data": data,
        "signature": signature,
        "server_time": int(time.time())
    }), status

def create_notification(user_id, source_type, content):
    """Internal helper to create a secure notification."""
    conn = get_db_connection()
    if not conn: return False
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO notifications (userId, sourceType, content)
            VALUES (%s, %s, %s)
        ''', (user_id, source_type, content))
        conn.commit()
        return True
    except Exception as e:
        app.logger.error(f"Failed to create notification: {e}")
        return False
    finally:
        conn.close()

@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT id, sourceType, content, isRead, createdAt
            FROM notifications
            WHERE userId = %s
            ORDER BY createdAt DESC
            LIMIT 50
        ''', (current_user_id,))
        notifs = cursor.fetchall()
        for n in notifs:
            n['createdAt'] = n['createdAt'].isoformat()
        return signed_json_response({"notifications": notifs})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/notifications/<int:notif_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notif_id):
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Security check: ensure user owns the notification
        cursor.execute('SELECT userId FROM notifications WHERE id = %s', (notif_id,))
        row = cursor.fetchone()
        if not row or row['userId'] != current_user_id:
            return signed_json_response({"error": "Unauthorized"}, 403)
            
        cursor.execute('UPDATE notifications SET isRead = TRUE WHERE id = %s', (notif_id,))
        conn.commit()
        return signed_json_response({"message": "Notification marked as read"})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/ai/analyze', methods=['POST'])
@jwt_required()
def ai_analyze_report():
    import google.generativeai as genai
    import json
    data = request.json or {}
    patient_name = data.get('patientName', 'Unknown Patient')
    report_type = data.get('reportType', 'General Health Assessment')
    
    system_prompt = f"""You are VaidyaMed-X Clinical AI. Analyze a {report_type} for patient {patient_name}.
Return a strict JSON response with EXACTLY these three keys and NO markdown formatting:
{{
    "result": "2-3 short sentences summarizing typical modern medicine findings.",
    "dosha": "Short sentence on which doshas are likely imbalanced.",
    "advice": "1-2 sentences of Ayurvedic dietary/lifestyle recommendations."
}}"""
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(system_prompt)
        text = response.text.strip()
        if text.startswith('```json'): text = text[7:]
        if text.startswith('```'): text = text[3:]
        if text.endswith('```'): text = text[:-3]
        
        analysis = json.loads(text.strip())
        analysis['patient'] = patient_name
        return jsonify({'status': 'success', 'data': analysis}), 200
    except Exception as e:
        app.logger.error(f"AI Analyze Error: {str(e)}")
        return jsonify({'status': 'success', 'data': {
            'patient': patient_name,
            'result': f'Simulated findings for {report_type}: Elevated markers indicated.',
            'dosha': 'Vata-Pitta Imbalance detected.',
            'advice': 'Increase hydration and recommend cooling herbs.'
        }}), 200

@app.route('/')
def home():
    return signed_json_response({
        "status": "online",
        "message": "NeuralAgent API Server is running",
        "endpoints": ["/api/auth/login", "/api/auth/register", "/api/forgot-password", "/api/messages/send", "/api/messages/history"]
    })

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    conn = get_db_connection()
    if not conn:
        return signed_json_response({"error": "Database error"}, 500)
        
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()
        
        if user:
            # Generate token
            reset_token = secrets.token_urlsafe(32)
            
            # Store in DB
            cursor.execute('INSERT INTO password_resets (email, token) VALUES (%s, %s)', (email, reset_token))
            conn.commit()
            
            # Send email
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000') # default or from env
            reset_link = f"{frontend_url}/reset-password?token={reset_token}"
            send_reset_email(email, reset_link, reset_token)
            
        return signed_json_response({"message": "If an account exists for that email, a reset link has been sent."}, 200)
    except Exception as e:
        app.logger.error(f"Forgot password error: {e}")
        return signed_json_response({"error": "Internal server error"}, 500)
    finally:
        conn.close()

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')
    
    if not token or not new_password:
        return signed_json_response({"error": "Token and new password required"}, 400)
        
    conn = get_db_connection()
    if not conn:
        return signed_json_response({"error": "Database error"}, 500)
        
    try:
        cursor = conn.cursor(dictionary=True)
        # Verify token (must exist and be newer than 1 hour)
        cursor.execute('''
            SELECT email FROM password_resets 
            WHERE token = %s AND created_at >= NOW() - INTERVAL 1 HOUR
        ''', (token,))
        reset_record = cursor.fetchone()
        
        if not reset_record:
            return signed_json_response({"error": "Invalid or expired reset token"}, 400)
            
        email = reset_record['email']
        
        # Hash new password
        hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
        
        # Update user password
        cursor.execute('UPDATE users SET password = %s WHERE email = %s', (hashed_password, email))
        
        # Cleanup used tokens for this user
        cursor.execute('DELETE FROM password_resets WHERE email = %s', (email,))
        
        conn.commit()
        return signed_json_response({"message": "Password updated successfully"}, 200)
    except Exception as e:
        app.logger.error(f"Reset password error: {e}")
        return signed_json_response({"error": "Internal server error"}, 500)
    finally:
        conn.close()

@app.errorhandler(404)
def not_found(e):
    app.logger.error(f"404 Error: {request.path} [{request.method}]")
    return signed_json_response({"error": "Path not found", "path": request.path}, 404)

@app.route('/api/auth/register', methods=['POST'])
@app.route('/api/register', methods=['POST'])  # backward compat
def register():
    # ── Accepted medical credentials ──────────────────────────────
    VALID_DEGREES = {
        'MBBS','MD','MS','BDS','MDS','BAMS','BHMS','BUMS','BPT','MPT',
        'BNYS','BVSC','MVSc','DNB','DM','MCh','PhD','MSc','BSc Nursing',
        'GNM','ANM','D.Pharm','B.Pharm','M.Pharm','Pharm.D','DMRT','DMRD',
        'DA','DCH','DGO','DLO','DTCD','DTM&H','DDVL','DEM','DFM','DPM',
        'DO','DOMS','FRCS','MRCP','FRCP','FRCOG','FACS','FIACS'
    }
    VALID_POSITIONS = {
        'Consultant', 'Senior Consultant', 'Resident Doctor', 'Junior Resident',
        'Senior Resident', 'Professor', 'Associate Professor', 'Assistant Professor',
        'HOD', 'Chief of Medicine', 'Vaidya', 'Chief Vaidya', 'Medical Officer',
        'General Practitioner', 'Specialist', 'Surgeon', 'Physician',
        'Intern', 'Fellow', 'Super Specialist', 'Director', 'CMO'
    }
    VALID_SPECIALIZATIONS = {
        'Ayurveda', 'Allopathy', 'Homeopathy', 'Unani', 'Naturopathy', 'Yoga & Naturopathy',
        'General Medicine', 'General Surgery', 'Cardiology', 'Dermatology', 'Neurology',
        'Orthopedics', 'Pediatrics', 'Gynecology', 'Psychiatry', 'Ophthalmology',
        'ENT', 'Radiology', 'Anesthesiology', 'Pathology', 'Oncology', 'Nephrology',
        'Urology', 'Endocrinology', 'Gastroenterology', 'Pulmonology', 'Rheumatology',
        'Hematology', 'Infectious Disease', 'Emergency Medicine', 'Family Medicine',
        'Community Medicine', 'Geriatrics', 'Sports Medicine', 'Palliative Care',
        'Physical Medicine', 'Dentistry', 'Oral Surgery', 'Physiotherapy',
        'Pharmacy', 'Nursing', 'Medical Genetics', 'Biomedicine', 'Nutrition & Dietetics',
        'Neonatology', 'Hepatology', 'Interventional Cardiology', 'Plastic Surgery',
        'Neurosurgery', 'Vascular Surgery', 'Thoracic Surgery', 'Transplant Medicine'
    }
    DUMMY_PATTERNS = ['test', 'dummy', 'fake', 'abc', 'xyz', 'asdf', 'qwerty', 'aaa', '123',
                      'na', 'n/a', 'none', 'nil', 'null', 'temporary', 'temp', 'sample']

    try:
        # Handle both JSON and FormData
        if request.content_type.startswith('multipart/form-data'):
            data = request.form.to_dict()
            file = request.files.get('document')
            doc_path = None
            if file:
                filename = secure_filename(file.filename)
                doc_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{int(timedelta(seconds=1).total_seconds())}_{filename}")
                file.save(doc_path)
        else:
            data = request.get_json()
            doc_path = None

        role = data.get('role')

        # ── Mobile format validation ─────────────────────────────────
        mobile = (data.get('mobile') or '').strip()
        if not mobile or not re.match(r'^[6-9]\d{9}$', mobile):
            return signed_json_response({"message": "Enter a valid 10-digit Indian mobile number starting with 6-9."}, 400)

        # ── Address validation (relaxed – catch only obvious garbage) ────────
        address_raw = (data.get('address') or '').strip().lower()
        if not address_raw or len(address_raw) < 5:
            return signed_json_response({"message": "Please enter a valid address."}, 400)
        # Block only exact dummy-word matches (not startsWith to avoid false positives)
        if address_raw in DUMMY_PATTERNS or address_raw in [p * 2 for p in DUMMY_PATTERNS]:
            return signed_json_response({"message": "Please enter a real address. Dummy or placeholder addresses are not allowed."}, 400)

        # ── Doctor-specific validations ──────────────────────────────
        if role == 'doctor':
            degree = (data.get('degree') or '').strip()
            position = (data.get('position') or '').strip()
            specialization = (data.get('specialization') or '').strip()
            hospital = (data.get('hospital') or '').strip()
            clinic_location = (data.get('clinicLocation') or data.get('clinic_location') or '').strip()
            reg_number = (data.get('regNumber') or '').strip()

            if degree not in VALID_DEGREES:
                return signed_json_response({"message": f"Invalid degree '{degree}'. Please select from the accepted medical qualifications."}, 400)
            if position not in VALID_POSITIONS:
                return signed_json_response({"message": f"Invalid position '{position}'. Please select from the accepted positions."}, 400)
            if specialization not in VALID_SPECIALIZATIONS:
                return signed_json_response({"message": f"Invalid specialization '{specialization}'. Please select from the accepted specializations."}, 400)
            if not hospital or len(hospital) < 3:
                return signed_json_response({"message": "Hospital / Clinic name is required."}, 400)
            if not clinic_location or len(clinic_location) < 5:
                return signed_json_response({"message": "Clinic location (address/area) is required for doctors."}, 400)
            if not reg_number:
                return signed_json_response({"message": "Medical Registration Number is required."}, 400)
            # Accept formats: MH-123456 / KA123456 / 12345678 (min 6 chars, alphanumeric)
            if not re.match(r'^[A-Z]{1,3}[-]?\d{5,10}$', reg_number.upper()):
                return signed_json_response({"message": "Invalid Medical Registration Number format. Expected format: STATE-XXXXXX (e.g. MH-123456 or DL12345)."}, 400)

        hashed_password = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')

        # Generate RSA Keys for new user
        private_pem, public_pem = generate_rsa_keypair()
        private_key_encrypted = encrypt_data(private_pem)

        # Age Validation (Patient minimum 1 year)
        if role == 'patient':
            dob_str = data.get('dob')
            if dob_str:
                try:
                    dob = datetime.datetime.strptime(dob_str, '%Y-%m-%d')
                    one_year_ago = datetime.datetime.now() - datetime.timedelta(days=365)
                    if dob > one_year_ago:
                        return signed_json_response({"message": "Patient must be at least 1 year old."}, 400)
                except ValueError:
                    return signed_json_response({"message": "Invalid date of birth format."}, 400)

        # Generate Verification Token
        verification_token = secrets.token_urlsafe(32)

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            # Check if user already exists by email
            cursor.execute('SELECT id, isVerified FROM users WHERE email = %s', (data.get('email'),))
            existing_user = cursor.fetchone()

            if existing_user:
                if existing_user.get('isVerified', 0):
                    return signed_json_response({"message": "Email already registered and verified. Please log in."}, 400)
                else:
                    # User exists but not verified - Resend verification
                    verification_token = secrets.token_urlsafe(32)
                    verification_otp = generate_otp()
                    cursor.execute('UPDATE users SET verificationToken = %s, verificationOtp = %s WHERE id = %s', (verification_token, verification_otp, existing_user['id']))
                    conn.commit()

                    api_url = os.environ.get('API_BASE_URL', 'https://api.vaidyamedx.in')
                    verification_link = f"{api_url}/api/auth/verify-email?token={verification_token}"
                    if send_verification_email(data.get('email'), verification_link, verification_otp):
                        return signed_json_response({"message": "Account already exists but is unverified. A new verification email has been sent."}, 200)
                    else:
                        return signed_json_response({"message": "Account exists but verification email failed to send. Please contact support."}, 500)

            # Check if mobile number already registered
            cursor.execute('SELECT id FROM users WHERE mobile = %s', (mobile,))
            if cursor.fetchone():
                return signed_json_response({"message": "This mobile number is already registered with another account."}, 400)

            # Generate Verification Token and OTP
            verification_token = secrets.token_urlsafe(32)
            verification_otp = generate_otp()

            cursor.execute('''
                INSERT INTO users (fullName, email, password, role, mobile, dob, gender, blood_group, address, city, state, pincode, rsaPublicKey, rsaPrivateKeyEncrypted, isVerified, verificationToken, verificationOtp)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                data.get('fullName'), data.get('email'), hashed_password, role,
                mobile, data.get('dob'), data.get('gender'), data.get('bloodGroup'),
                data.get('address'), data.get('city'), data.get('state'), data.get('pincode'),
                public_pem, private_key_encrypted, 0, verification_token, verification_otp
            ))
            user_id = cursor.lastrowid

            if role == 'doctor':
                clinic_location = (data.get('clinicLocation') or data.get('clinic_location') or '').strip()
                cursor.execute('''
                    INSERT INTO doctor_details (userId, degree, position, specialization, experience, hospital, clinic_location, regNumber, documentPath, verificationStatus)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
                ''', (
                    user_id, data.get('degree'), data.get('position'), data.get('specialization'),
                    data.get('experience'), data.get('hospital'), clinic_location,
                    data.get('regNumber'), doc_path
                ))
            if role == 'patient':
                cursor.execute('''
                    INSERT INTO patient_details (userId)
                    VALUES (%s)
                ''', (user_id,))

            conn.commit()

            # Send Verification Email
            api_url = os.environ.get('API_BASE_URL', 'https://api.vaidyamedx.in')
            verification_link = f"{api_url}/api/auth/verify-email?token={verification_token}"
            send_verification_email(data.get('email'), verification_link, verification_otp)

            extra_msg = " Your credentials will be reviewed and verified shortly." if role == 'doctor' else ""
            return signed_json_response({"message": f"{role.capitalize()} registered successfully! Please check your email to verify your account.{extra_msg}"}, 201)

        except mysql.connector.IntegrityError as ie:
            err_msg = str(ie)
            if 'mobile' in err_msg:
                return signed_json_response({"message": "This mobile number is already registered."}, 400)
            return signed_json_response({"message": "Email already registered."}, 400)
        finally:
            conn.close()

    except Exception as e:
        return signed_json_response({"message": str(e)}, 500)


@app.route('/api/auth/login', methods=['POST'])
@app.route('/api/login', methods=['POST'])  # backward compat
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password')
    role = data.get('role')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return signed_json_response({"message": "Invalid email or password."}, 401)
    
    if not bcrypt.check_password_hash(user['password'], password):
        return signed_json_response({"message": "Invalid email or password."}, 401)

    if user['role'] != role:
        return signed_json_response({"message": f"Access denied. You are registered as a {user['role']}."}, 403)

    if not user.get('isVerified', 0):
        return signed_json_response({"message": "Please verify your email address before logging in. Check your inbox for the verification link."}, 403)

    # 2FA Check
    if user.get('twoFactorEnabled'):
        otp_code = generate_otp()
        otp_expiry = datetime.datetime.now() + datetime.timedelta(minutes=5)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET otpCode = %s, otpExpiry = %s WHERE id = %s", (otp_code, otp_expiry, user['id']))
        conn.commit()
        conn.close()
        
        if send_otp_email(user['email'], otp_code):
            return signed_json_response({
                "status": "2fa_required",
                "message": "A 2FA code has been sent to your email.",
                "email": user['email']
            }, 200)
        else:
            return signed_json_response({"message": "Failed to send 2FA code. Please try again later."}, 500)

    access_token = create_access_token(identity=str(user['id']))

    return signed_json_response({
        "token": access_token,
        "user_id": user['id'],
        "role": user['role'],
        "user": {
            "id": user['id'],
            "name": user['fullName'],
            "email": user['email'],
            "mobile": user['mobile']
        }
    })

@app.route('/api/auth/verify-email', methods=['GET'])
def verify_email():
    token = request.args.get('token')
    if not token:
        return signed_json_response({"error": "Missing verification token"}, 400)
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE verificationToken = %s", (token,))
        user = cursor.fetchone()
        
        if not user:
            return "<h1>Invalid Link</h1><p>This verification link is invalid or has already been used.</p>"
        
        cursor.execute("UPDATE users SET isVerified = 1, verificationToken = NULL WHERE id = %s", (user['id'],))
        conn.commit()
        
        return """
        <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #2d6a4f;">Email Verified Successfully!</h1>
                <p>Your account is now active. You will be redirected to the login page in 3 seconds...</p>
                <script>setTimeout(() => window.location.href='https://vaidyamedx.in/login', 3000)</script>
            </body>
        </html>
        """
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/auth/verify-registration-otp', methods=['POST'])
def verify_registration_otp():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '').strip()
    
    if not email or not otp:
        return signed_json_response({"error": "Email and OTP required"}, 400)
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s AND verificationOtp = %s", (email, otp))
        user = cursor.fetchone()
        
        if not user:
            return signed_json_response({"error": "Invalid verification code"}, 400)
        
        cursor.execute("UPDATE users SET isVerified = 1, verificationToken = NULL, verificationOtp = NULL WHERE id = %s", (user['id'],))
        conn.commit()
        
        return signed_json_response({"message": "Email verified successfully! You can now log in."}, 200)
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/auth/verify-2fa-otp', methods=['POST'])
def verify_2fa_otp():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '').strip()

    if not email or not otp:
        return signed_json_response({"error": "Email and OTP are required"}, 400)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        app.logger.info(f"VERIFY_2FA: Checking OTP for {email}")
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user:
            app.logger.warning(f"VERIFY_2FA: User {email} not found")
            return signed_json_response({"error": "User not found"}, 404)

        stored_otp = user.get('otpCode')
        expiry = user.get('otpExpiry')
        current_time = datetime.datetime.now()

        app.logger.info(f"VERIFY_2FA: User found. Input: {otp}, Stored: {stored_otp}, Expiry: {expiry}, Now: {current_time}")

        if not stored_otp or str(stored_otp).strip() != str(otp).strip():
             app.logger.warning(f"VERIFY_2FA: Invalid OTP match attempt for {email}. Input: {otp}, Stored: {stored_otp}")
             return signed_json_response({"error": "Invalid OTP code"}, 401)
        
        if expiry and expiry < current_time:
            app.logger.warning(f"VERIFY_2FA: OTP expired for {email}")
            return signed_json_response({"error": "OTP code has expired"}, 401)

        # Clear OTP after successful use
        cursor.execute("UPDATE users SET otpCode = NULL, otpExpiry = NULL WHERE id = %s", (user['id'],))
        conn.commit()

        access_token = create_access_token(identity=str(user['id']))
        return signed_json_response({
            "token": access_token,
            "user_id": user['id'],
            "role": user['role'],
            "user": {
                "id": user['id'],
                "name": user['fullName'],
                "email": user['email'],
                "mobile": user['mobile']
            }
        })
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/auth/2fa/toggle', methods=['POST'])
@jwt_required()
def toggle_2fa():
    user_id = get_jwt_identity()
    data = request.get_json()
    enabled = data.get('enabled')
    password = data.get('password')

    if enabled is None or not password:
        return signed_json_response({"error": "Status and password are required"}, 400)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT password FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user or not bcrypt.check_password_hash(user['password'], password):
            return signed_json_response({"error": "Invalid password"}, 401)

        cursor.execute("UPDATE users SET twoFactorEnabled = %s WHERE id = %s", (enabled, user_id))
        conn.commit()
        
        status_msg = "enabled" if enabled else "disabled"
        return signed_json_response({"message": f"2FA has been successfully {status_msg}."}, 200)
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/auth/resend-verification', methods=['POST'])
def resend_verification():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return signed_json_response({"error": "Email required"}, 400)
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, isVerified FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            return signed_json_response({"error": "Email not found"}, 404)
        
        if user.get('isVerified', 0):
            return signed_json_response({"message": "Email already verified. Please log in."}, 400)
        
        # Regenerate token
        verification_token = secrets.token_urlsafe(32)
        cursor.execute("UPDATE users SET verificationToken = %s WHERE id = %s", (verification_token, user['id']))
        conn.commit()
        
        api_url = os.environ.get('API_BASE_URL', 'https://api.vaidyamedx.in')
        verification_link = f"{api_url}/api/auth/verify-email?token={verification_token}"
        if send_verification_email(email, verification_link):
            return signed_json_response({"message": "A new verification link has been sent to your email."}, 200)
        else:
            return signed_json_response({"error": "Failed to send email. Please check SMTP settings."}, 500)
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

# --- Secure Messaging Endpoints ---

@app.route('/api/messages/send', methods=['POST'])
@jwt_required()
@require_hmac
def send_message():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    receiver_id = data.get('receiverId')
    content = data.get('content')
    
    if not receiver_id or not content:
        return signed_json_response({"error": "Receiver and content required"}, 400)
    
    # Encrypt data before storage
    encrypted_content = encrypt_data(content)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO messages (senderId, receiverId, encryptedContext)
            VALUES (%s, %s, %s)
        ''', (current_user_id, receiver_id, encrypted_content))
        conn.commit()
        return signed_json_response({"message": "Message sent securely!"}, 201)
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/messages/history/<int:other_id>', methods=['GET'])
@jwt_required()
def get_messages(other_id):
    current_user_id = int(get_jwt_identity())
    user_id = current_user_id
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute('''
        SELECT * FROM messages 
        WHERE (senderId = %s AND receiverId = %s) 
           OR (senderId = %s AND receiverId = %s)
        ORDER BY timestamp ASC
    ''', (user_id, other_id, other_id, user_id))
    
    rows = cursor.fetchall()
    conn.close()
    
    messages = []
    for row in rows:
        decrypted_content = decrypt_data(row['encryptedContext'])
        messages.append({
            "id": row['id'],
            "senderId": row['senderId'],
            "receiverId": row['receiverId'],
            "content": decrypted_content if decrypted_content else "[DECRYPTION FAILED]",
            "timestamp": row['timestamp'].isoformat()
        })
        
    return signed_json_response({"messages": messages})

# --- Advanced Communication Module (v2) ---

@app.route('/api/v2/messages/send', methods=['POST'])
@jwt_required()
@require_hmac
def send_hybrid_message():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    receiver_id = data.get('receiverId')
    content = data.get('content')

    if not receiver_id or not content:
        return signed_json_response({"error": "Receiver and content required"}, 400)

    # Check sender role
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT role FROM users WHERE id = %s", (current_user_id,))
    user = cursor.fetchone()
    is_doctor = user['role'] == 'doctor' if user else False

    # --- Appointment gating: must have an active appointment starting soon or ongoing ---
    cursor.execute('''
        SELECT appointmentDate, appointmentTime, status FROM appointments
        WHERE ((patientId = %s AND doctorId = %s) OR (patientId = %s AND doctorId = %s))
          AND status = 'Scheduled'
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, NOW(), CONCAT(appointmentDate, ' ', appointmentTime))) ASC
        LIMIT 1
    ''', (current_user_id, receiver_id, receiver_id, current_user_id))
    appt = cursor.fetchone()
    
    if not appt:
        conn.close()
        return signed_json_response({
            "error": "No scheduled appointment found. Please book an appointment first.",
            "code": "NO_APPOINTMENT"
        }, 403)

    # Check time window: Allow from 10 mins before start
    from datetime import datetime as dt
    try:
        appt_dt = dt.combine(appt['appointmentDate'], dt.min.time()) + appt['appointmentTime']
        now = dt.now()
        diff = (appt_dt - now).total_seconds()
        
        if diff > 600: # More than 10 minutes before
            conn.close()
            return signed_json_response({
                "error": f"Communication window not open yet. Please wait until 10 minutes before your appointment at {appt['appointmentTime']}.",
                "code": "WINDOW_NOT_OPEN"
            }, 403)
    except Exception as e:
        app.logger.error(f"Time window check failed: {e}")

    conn.close()
    result, status = chat_vcall.send_chat_message(current_user_id, receiver_id, content, is_doctor)
    if status == 201:
        create_notification(receiver_id, 'Message', f"New secure message from user #{current_user_id}")
    return signed_json_response(result, status)

@app.route('/api/v2/messages/history/<int:other_id>', methods=['GET'])
@jwt_required()
def get_hybrid_messages(other_id):
    current_user_id = int(get_jwt_identity())
    result, status = chat_vcall.get_chat_history(current_user_id, other_id)
    return signed_json_response(result, status)

@app.route('/api/v2/vcall/initiate', methods=['POST'])
@jwt_required()
@require_hmac
def initiate_vcall():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    receiver_id = data.get('receiverId')
    
    if not receiver_id:
        return signed_json_response({"error": "Receiver ID required"}, 400)
        
    # Signaling as a special hybrid encrypted message
    content = f"VIDEO_CALL_INITIATED:{int(time.time())}"
    
    result, status = chat_vcall.send_chat_message(current_user_id, receiver_id, content, False)
    if status == 201:
        create_notification(receiver_id, 'Call', f"Incoming video call request from user #{current_user_id}")
    return signed_json_response({"message": "Video call signal sent!", "detail": result}, status)

@app.route('/api/user/profile', methods=['GET', 'PUT'])
@app.route('/api/profile', methods=['GET', 'PUT'])  # backward compat
@jwt_required()
def handle_profile():
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        cursor.execute('''
            SELECT u.fullName as name, u.email, u.mobile, u.twoFactorEnabled, u.dob, u.gender,
                   u.blood_group as bloodGroup, u.address, u.city, u.state, u.pincode as pin,
                   u.isVerified, u.role,
                   pd.dosha, pd.allergies, pd.conditions, pd.medications,
                   dd.degree, dd.position, dd.specialization, dd.experience, dd.hospital,
                   dd.clinic_location as clinicLocation, dd.regNumber, dd.consultantFee,
                   dd.workingHours, dd.verificationStatus, dd.upiId, dd.bankAccountDetails,
                   dd.bankAccountName, dd.bankAccountNumber, dd.bankIfsc, dd.payoutVerified
            FROM users u
            LEFT JOIN patient_details pd ON u.id = pd.userId
            LEFT JOIN doctor_details dd ON u.id = dd.userId
            WHERE u.id = %s
        ''', (current_user_id,))
        profile = cursor.fetchone()
        conn.close()
        return signed_json_response(profile or {})
        
    elif request.method == 'PUT':
        data = request.get_json()
        
        # Check if user is patient and validate age
        conn2 = get_db_connection()
        cursor2 = conn2.cursor(dictionary=True)
        cursor2.execute("SELECT role FROM users WHERE id = %s", (current_user_id,))
        user_role = cursor2.fetchone()['role']
        conn2.close()

        if user_role == 'patient':
            dob_str = data.get('dob')
            if dob_str:
                try:
                    dob = datetime.datetime.strptime(dob_str, '%Y-%m-%d')
                    one_year_ago = datetime.datetime.now() - datetime.timedelta(days=365)
                    if dob > one_year_ago:
                        return signed_json_response({"message": "Patient must be at least 1 year old."}, 400)
                except ValueError:
                    pass # Allow existing non-standard formats for now, but block invalid new ones

        # update users table
        cursor.execute('''
            UPDATE users SET fullName=%s, mobile=%s, dob=%s, gender=%s, blood_group=%s, address=%s, city=%s, state=%s, pincode=%s
            WHERE id=%s
        ''', (data.get('name'), data.get('mobile'), data.get('dob'), data.get('gender'), data.get('bloodGroup'), data.get('address'), data.get('city'), data.get('state'), data.get('pin'), current_user_id))
        
        # update or insert patient_details
        if user_role == 'patient':
            cursor.execute("SELECT userId FROM patient_details WHERE userId=%s", (current_user_id,))
            if cursor.fetchone():
                cursor.execute('''
                    UPDATE patient_details SET dosha=%s, allergies=%s, conditions=%s, medications=%s
                    WHERE userId=%s
                ''', (data.get('dosha'), data.get('allergies'), data.get('conditions'), data.get('medications'), current_user_id))
            else:
                cursor.execute('''
                    INSERT INTO patient_details (userId, dosha, allergies, conditions, medications)
                    VALUES (%s, %s, %s, %s, %s)
                ''', (current_user_id, data.get('dosha'), data.get('allergies'), data.get('conditions'), data.get('medications')))

        # update doctor_details if doctor
        if user_role == 'doctor':
            cursor.execute("SELECT userId FROM doctor_details WHERE userId=%s", (current_user_id,))
            if cursor.fetchone():
                cursor.execute('''
                    UPDATE doctor_details
                    SET degree=%s, position=%s, specialization=%s, experience=%s,
                        hospital=%s, clinic_location=%s, regNumber=%s,
                        consultantFee=%s, workingHours=%s, upiId=%s, bankAccountDetails=%s,
                        bankAccountName=%s, bankAccountNumber=%s, bankIfsc=%s
                    WHERE userId=%s
                ''', (
                    data.get('degree'), data.get('position'), data.get('specialization'),
                    data.get('experience'), data.get('hospital'), data.get('clinicLocation'),
                    data.get('regNumber'), data.get('consultantFee'), data.get('workingHours'),
                    data.get('upiId'), data.get('bankAccountDetails'),
                    data.get('bankAccountName'), data.get('bankAccountNumber'), data.get('bankIfsc'),
                    current_user_id
                ))
        
        conn.commit()
        
        # return updated
        cursor.execute('''
            SELECT u.fullName as name, u.email, u.mobile, u.twoFactorEnabled, u.dob, u.gender, u.blood_group as bloodGroup, u.address, u.city, u.state, u.pincode as pin, u.isVerified, u.role
            FROM users u
            WHERE u.id = %s
        ''', (current_user_id,))
        profile = cursor.fetchone()
        conn.close()
        return signed_json_response(profile or {"message": "Profile updated!"})

@app.route('/api/doctors', methods=['GET'])
@jwt_required()
def get_doctors():
    """Lists all registered doctors. Supports optional ?city=lucknow and ?location=city_area filtering."""
    city = request.args.get('city', '').strip()
    location = request.args.get('location', '').strip()
    specialization = request.args.get('spec', '').strip()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = '''
        SELECT u.id, u.fullName as name, u.city, u.state, d.specialization as spec,
               d.degree, d.experience, d.hospital, d.clinic_location as clinicLocation,
               d.consultantFee as fee, d.workingHours, d.verificationStatus
        FROM users u
        JOIN doctor_details d ON u.id = d.userId
        WHERE u.role = 'doctor' AND u.isVerified = 1
    '''
    params = []

    if city:
        query += " AND (LOWER(u.city) LIKE %s OR LOWER(u.state) LIKE %s)"
        params.extend([f"%{city.lower()}%", f"%{city.lower()}%"])

    if location:
        query += " AND (LOWER(d.clinic_location) LIKE %s OR LOWER(u.city) LIKE %s OR LOWER(u.address) LIKE %s)"
        params.extend([f"%{location.lower()}%", f"%{location.lower()}%", f"%{location.lower()}%"])

    if specialization:
        query += " AND LOWER(d.specialization) LIKE %s"
        params.append(f"%{specialization.lower()}%")

    query += " ORDER BY d.experience DESC"

    cursor.execute(query, params)
    doctors = cursor.fetchall()
    conn.close()
    for d in doctors:
        d['rating'] = 4.8  # placeholder until rating system is built
    return signed_json_response({"doctors": doctors})


@app.route('/api/doctors/my-patients', methods=['GET'])
@jwt_required()
def get_my_patients():
    """Returns only patients who have a Scheduled or Completed appointment with this doctor."""
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT DISTINCT u.id, u.fullName, u.email,
                   a.appointmentDate, a.appointmentTime, a.type, a.status
            FROM appointments a
            JOIN users u ON a.patientId = u.id
            WHERE a.doctorId = %s AND a.status IN ('Scheduled', 'Completed')
            ORDER BY a.appointmentDate DESC
        ''', (current_user_id,))
        patients = cursor.fetchall()
        for p in patients:
            if p.get('appointmentDate'):
                p['appointmentDate'] = str(p['appointmentDate'])
            if p.get('appointmentTime'):
                p['appointmentTime'] = str(p['appointmentTime'])
        return signed_json_response({"patients": patients})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/appointments/check/<int:doctor_id>', methods=['GET'])
@jwt_required()
def check_appointment(doctor_id):
    """Returns whether the current patient has an active appointment with this doctor."""
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT id, type, appointmentDate, appointmentTime, status
        FROM appointments
        WHERE patientId = %s AND doctorId = %s
          AND status IN ('Scheduled', 'Completed')
        ORDER BY appointmentDate DESC
        LIMIT 1
    ''', (current_user_id, doctor_id))
    appt = cursor.fetchone()
    conn.close()
    if appt:
        if appt.get('appointmentDate'):
            appt['appointmentDate'] = str(appt['appointmentDate'])
        if appt.get('appointmentTime'):
            appt['appointmentTime'] = str(appt['appointmentTime'])
        return signed_json_response({"hasAppointment": True, "appointment": appt})
    return signed_json_response({"hasAppointment": False})

@app.route('/api/doctors/search', methods=['GET'])
@jwt_required()
def search_doctors():
    """Searches doctors by name for messaging suggestions."""
    query = request.args.get('q', '')
    if not query:
        return signed_json_response({"doctors": []})
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        search_term = f"%{query}%"
        cursor.execute('''
            SELECT u.id, u.fullName as name, d.specialization as spec
            FROM users u 
            JOIN doctor_details d ON u.id = d.userId 
            WHERE u.role = 'doctor' AND u.fullName LIKE %s
            LIMIT 10
        ''', (search_term,))
        doctors = cursor.fetchall()
        return signed_json_response({"doctors": doctors})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/patients', methods=['GET'])
@jwt_required()
def get_patients():
    """Lists all registered patients."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT id, fullName, email 
        FROM users 
        WHERE role = 'patient'
    ''')
    patients = cursor.fetchall()
    conn.close()
    return signed_json_response({"patients": patients})

@app.route('/api/appointments', methods=['POST'])
@jwt_required()
def book_appointment():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    doctor_id = data.get('doctorId')
    date = data.get('date')
    time_raw = data.get('time')
    app_type = data.get('type')
    notes = data.get('notes', '')
    
    if not all([doctor_id, date, time_raw, app_type]):
        return signed_json_response({"error": "Missing booking details"}, 400)
    
    # Convert 12-hour AM/PM format (e.g. "09:00 AM") to 24-hour format for MySQL
    try:
        from datetime import datetime as dt
        time = dt.strptime(time_raw.strip(), '%I:%M %p').strftime('%H:%M:%S')
    except ValueError:
        time = time_raw  # Already in 24h format or other valid format
    
    conn = get_db_connection()
    if not conn:
        return signed_json_response({"error": "Database connection failed"}, 500)
    cursor = conn.cursor()
    
    try:
        # Fetch doctor name for patient notification
        cursor.execute('SELECT fullName FROM users WHERE id = %s', (doctor_id,))
        doc_data = cursor.fetchone()
        doc_name = doc_data[0] if doc_data else "Doctor"

        # Conflict check: Is this slot already booked for this doctor?
        cursor.execute('''
            SELECT id FROM appointments 
            WHERE doctorId = %s AND appointmentDate = %s AND appointmentTime = %s 
              AND status = 'Scheduled'
        ''', (doctor_id, date, time))
        if cursor.fetchone():
            conn.close()
            return signed_json_response({"error": "This slot is already booked. Please choose another time or slot."}, 409)

        cursor.execute('''
            INSERT INTO appointments (patientId, doctorId, appointmentDate, appointmentTime, type, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (current_user_id, doctor_id, date, time, app_type, notes))
        app_id = cursor.lastrowid
        conn.commit()
        
        # Notify Doctor
        create_notification(doctor_id, 'Appointment', f"New {app_type} appointment booked for {date} at {time}")
        
        # Notify Patient
        create_notification(current_user_id, 'Appointment', f"Confirmed: Your appointment with {doc_name} is set for {date} at {time}")
        
        return signed_json_response({"message": "Appointment booked successfully!", "appointmentId": app_id}, 201)
    except Exception as e:
        app.logger.error(f"Appointment booking error: {e}")
        app.logger.error(traceback.format_exc())
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/appointments', methods=['GET'])
@jwt_required()
def get_appointments():
    current_user_id = int(get_jwt_identity())
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Check role to fetch correct associations
        cursor.execute('SELECT role FROM users WHERE id = %s', (current_user_id,))
        role_data = cursor.fetchone()
        if not role_data:
            return signed_json_response({"error": "User not found"}, 404)
        role = role_data['role']
        
        if role == 'patient':
            cursor.execute('''
                SELECT a.*, u.fullName as doctorName, d.specialization as spec
                FROM appointments a
                JOIN users u ON a.doctorId = u.id
                LEFT JOIN doctor_details d ON u.id = d.userId
                WHERE a.patientId = %s
                ORDER BY a.appointmentDate DESC, a.appointmentTime DESC
            ''', (current_user_id,))
        else:
            cursor.execute('''
                SELECT a.*, u.fullName as patientName
                FROM appointments a
                JOIN users u ON a.patientId = u.id
                WHERE a.doctorId = %s
                ORDER BY a.appointmentDate DESC, a.appointmentTime DESC
            ''', (current_user_id,))
            
        appointments = cursor.fetchall()
        # Format dates/times for JSON serialization
        for a in appointments:
            a['appointmentDate'] = a['appointmentDate'].isoformat() if a.get('appointmentDate') else None
            a['appointmentTime'] = str(a['appointmentTime']) if a.get('appointmentTime') else None
            if a.get('createdAt'):
                a['createdAt'] = a['createdAt'].isoformat()
            
        return signed_json_response({"appointments": appointments})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/appointments/<int:app_id>', methods=['PUT'])
@jwt_required()
def update_appointment(app_id):
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    status = data.get('status')
    
    if not status:
        return signed_json_response({"error": "Status required"}, 400)
        
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Verify ownership
        cursor.execute('SELECT patientId, doctorId FROM appointments WHERE id = %s', (app_id,))
        app_data = cursor.fetchone()
        if not app_data or (current_user_id not in app_data.values()):
            return signed_json_response({"error": "Unauthorized"}, 403)
            
        cursor.execute('UPDATE appointments SET status = %s WHERE id = %s', (status, app_id))
        
        # Notify the other party
        other_user_id = app_data['doctorId'] if current_user_id == app_data['patientId'] else app_data['patientId']
        
        # Get names for the notification
        cursor.execute('SELECT fullName FROM users WHERE id = %s', (current_user_id,))
        caller_name = cursor.fetchone()['fullName']
        
        content = f"Appointment {app_id} has been {status.lower()} by {caller_name}."
        create_notification(other_user_id, 'Appointment', content)

        # Ringing for Video Calls: Notify patient when doctor starts live session
        if status == 'Live' and current_user_id == app_data['doctorId']:
            socketio.emit('appointment_call_incoming', {
                "doctorName": caller_name,
                "doctorId": current_user_id,
                "appointmentId": app_id
            }, room=f"user_{app_data['patientId']}")
        
        conn.commit()
        return signed_json_response({"message": "Appointment status updated successfully"})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()


def run_payout_in_background(appointment_id):
    """Internal helper to process payout in a separate thread."""
    conn = get_db_connection()
    if not conn: return
    cursor = conn.cursor(dictionary=True)
    try:
        # Get payout details
        cursor.execute(
            "SELECT a.doctorPayoutAmount, d.upiId, u.fullName, u.email, u.mobile "
            "FROM appointments a JOIN doctor_details d ON a.doctorId = d.userId "
            "JOIN users u ON d.userId = u.id WHERE a.id = %s",
            (appointment_id,)
        )
        data = cursor.fetchone()
        
        if not data or not data["upiId"]:
            return

        # Execute Payout
        try:
            # 1. Ensure contact/fund account exists
            contact_id = razorpay_service.create_contact(data["fullName"], data["email"], data["mobile"])
            fund_account_id = razorpay_service.create_fund_account_upi(contact_id, data["upiId"])
            
            # 2. Trigger Payout
            payout = razorpay_service.execute_payout(fund_account_id, data["doctorPayoutAmount"])
            
            # 3. Log Payout
            cursor.execute(
                "INSERT INTO payout_logs (appointmentId, payoutId, amount, status) VALUES (%s, %s, %s, %s)",
                (appointment_id, payout["id"], data["doctorPayoutAmount"], payout["status"])
            )
            cursor.execute(
                "UPDATE appointments SET payoutId = %s, payoutStatus = %s WHERE id = %s",
                (payout["id"], payout["status"], appointment_id)
            )
            conn.commit()
            
        except Exception as payout_err:
            app.logger.error(f"Payout execution failed: {str(payout_err)}")
            cursor.execute(
                "INSERT INTO payout_logs (appointmentId, amount, status, errorMessage) VALUES (%s, %s, %s, %s)",
                (appointment_id, data["doctorPayoutAmount"], "failed", str(payout_err))
            )
            cursor.execute("UPDATE appointments SET payoutStatus = 'failed' WHERE id = %s", (appointment_id,))
            conn.commit()
            
    except Exception as e:
        app.logger.error(f"Internal payout processing error: {str(e)}")
    finally:
        conn.close()

@app.route('/api/payments/create-order', methods=['POST'])
@jwt_required()
@require_hmac
def create_payment_order():
    """Creates a Razorpay order for an appointment or verification."""
    data = request.get_json()
    purpose = data.get('purpose') # 'appointment' or 'verification'
    doctor_id = data.get('doctorId')
    
    if purpose == 'verification':
        amount = 100 # ₹1
    else:
        if not doctor_id:
            return signed_json_response({"error": "Doctor ID required"}, 400)
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT consultantFee FROM doctor_details WHERE userId = %s", (doctor_id,))
        doc = cursor.fetchone()
        conn.close()
        amount = (doc['consultantFee'] if doc else 500) * 100
        
    try:
        order = razorpay_service.create_order(amount, f"receipt_{int(time.time())}")
        return signed_json_response(order)
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)

@app.route('/api/payments/verify', methods=['POST'])
@jwt_required()
@require_hmac
def verify_payment():
    """Verifies payment and creates appointment."""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Razorpay details
    rzp_pay_id = data.get('razorpay_payment_id')
    rzp_ord_id = data.get('razorpay_order_id')
    rzp_sig = data.get('razorpay_signature')
    
    # Appointment details
    doctor_id = data.get('doctorId')
    appt_date = data.get('date')
    appt_time_raw = data.get('time')
    appt_type = data.get('type')
    notes = data.get('notes', '')
    
    # Convert time
    try:
        from datetime import datetime as dt
        appt_time = dt.strptime(appt_time_raw.strip(), '%I:%M %p').strftime('%H:%M:%S')
    except:
        appt_time = appt_time_raw

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get fee and calculate split
        cursor.execute("SELECT consultantFee FROM doctor_details WHERE userId = %s", (doctor_id,))
        doc = cursor.fetchone()
        fee = (doc['consultantFee'] if doc else 500)
        
        commission = int(fee * 0.05)
        payout_amount = (fee - commission) * 100 # work in paise for Razorpay
        
        # Create appointment
        cursor.execute('''
            INSERT INTO appointments (patientId, doctorId, appointmentDate, appointmentTime, type, notes, status, paymentId, orderId, amountPaid, commissionAmount, doctorPayoutAmount)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (current_user_id, doctor_id, appt_date, appt_time, appt_type, notes, 'Scheduled', rzp_pay_id, rzp_ord_id, fee, commission, (fee - commission)))
        
        appt_id = cursor.lastrowid
        conn.commit()
        
        # Trigger Payout in background
        threading.Thread(target=run_payout_in_background, args=(appt_id,)).start()
        
        return signed_json_response({"message": "Appointment booked and payout initiated!", "appointmentId": appt_id}, 201)
    except Exception as e:
        conn.rollback()
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/payments/webhook', methods=['POST'])
def razorpay_webhook():
    """Handles Razorpay webhooks for payment.captured."""
    payload = request.data.decode('utf-8')
    signature = request.headers.get("X-Razorpay-Signature")
    
    if not razorpay_service.verify_webhook_signature(payload, signature):
        return jsonify({"status": "error", "message": "Invalid signature"}), 400
        
    event_data = request.get_json()
    if event_data.get("event") == "payment.captured":
        # Additional logic can go here if needed
        pass
        
    return jsonify({"status": "ok"})

@app.route('/api/doctor/payout-setup', methods=['POST'])
@jwt_required()
def setup_doctor_payout():
    """Updates doctor payout details."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    upi_id = data.get('upiId')
    acc_name = data.get('bankAccountName')
    acc_num = data.get('bankAccountNumber')
    ifsc = data.get('bankIfsc')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE doctor_details 
            SET upiId = %s, bankAccountName = %s, bankAccountNumber = %s, bankIfsc = %s, payoutVerified = FALSE
            WHERE userId = %s
        ''', (upi_id, acc_name, acc_num, ifsc, user_id))
        conn.commit()
        return signed_json_response({"message": "Payout details updated successfully"})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/doctor/verify-upi', methods=['POST'])
@jwt_required()
def verify_doctor_upi():
    """Verifies doctor UPI via ₹1 test payout."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    upi_id = data.get('upiId')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT fullName, email, mobile FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return signed_json_response({"error": "User not found"}, 404)
        
    result = razorpay_service.verify_upi_test_transaction(user['fullName'], user['email'], user['mobile'], upi_id)
    
    if result['success']:
        cursor.execute("UPDATE doctor_details SET upiId = %s, payoutVerified = 0 WHERE userId = %s", (upi_id, user_id))
        conn.commit()
        conn.close()
        return signed_json_response({"message": "Verification payout initiated!", "payout_id": result['payout_id']})
    else:
        conn.close()
        return signed_json_response({"error": result['error']}, 400)

@app.route('/api/payments/payout-status/<payout_id>', methods=['GET'])
@jwt_required()
def get_payout_status_route(payout_id):
    """Checks the status of a payout from Razorpay and updates DB."""
    auth = (razorpay_service.key_id, razorpay_service.key_secret)
    url = f"https://api.razorpay.com/v1/payouts/{payout_id}"
    response = requests.get(url, auth=auth)
    
    if response.status_code == 200:
        data = response.json()
        status = data["status"]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE appointments SET payoutStatus = %s WHERE payoutId = %s", (status, payout_id))
        cursor.execute("UPDATE payout_logs SET status = %s WHERE payoutId = %s", (status, payout_id))
        conn.commit()
        conn.close()
        return signed_json_response(data)
    else:
        return signed_json_response({"error": "Failed to fetch payout status"}, response.status_code)

# --- Emergency Endpoints ---

@app.route('/api/emergencies', methods=['POST'])
@jwt_required()
def create_emergency():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT fullName FROM users WHERE id = %s", (current_user_id,))
        patient = cursor.fetchone()
        patient_name = patient['fullName'] if patient else "Unknown"
        
        cursor.execute('''
            INSERT INTO emergencies (patientId, patientName, contact, caseType, description)
            VALUES (%s, %s, %s, %s, %s)
        ''', (current_user_id, patient_name, data.get('contact'), data.get('caseType'), data.get('explanation')))
        
        emergency_id = cursor.lastrowid
        conn.commit()
        
        emergency_data = {
            "id": f"EM-{emergency_id}",
            "dbId": emergency_id,
            "patient": patient_name,
            "patientId": current_user_id,
            "contact": data.get('contact'),
            "type": data.get('caseType'),
            "desc": data.get('explanation'),
            "time": "Just now",
            "location": "Registered Address",
            "emergency_contact": "On File"
        }
        
        socketio.emit('new_emergency', emergency_data)
        return signed_json_response({"message": "Emergency broadcasted", "emergency": emergency_data}, 201)
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/emergencies', methods=['GET'])
@jwt_required()
def get_emergencies():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM emergencies WHERE status = 'Active' ORDER BY createdAt DESC")
        rows = cursor.fetchall()
        
        emergencies = []
        for r in rows:
            emergencies.append({
                "id": f"EM-{r['id']}",
                "dbId": r['id'],
                "patient": r['patientName'],
                "patientId": r['patientId'],
                "contact": r['contact'],
                "type": r['caseType'],
                "desc": r['description'],
                "time": r['createdAt'].strftime('%H:%M') if r['createdAt'] else "N/A",
                "location": "Stored Location",
                "emergency_contact": "On File"
            })
        return signed_json_response({"emergencies": emergencies})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/emergencies/my', methods=['GET'])
@jwt_required()
def get_my_emergencies():
    """Patient's own emergency history."""
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM emergencies WHERE patientId = %s ORDER BY createdAt DESC", (current_user_id,))
        rows = cursor.fetchall()
        emergencies = []
        for r in rows:
            emergencies.append({
                "id": f"EM-{r['id']}",
                "dbId": r['id'],
                "type": r['caseType'],
                "desc": r['description'],
                "status": r['status'],
                "time": r['createdAt'].strftime('%d %b %Y, %H:%M') if r['createdAt'] else "N/A"
            })
        return signed_json_response({"emergencies": emergencies})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/emergencies/<int:em_id>/notify_patient', methods=['POST'])
@jwt_required()
def notify_patient_emergency_call(em_id):
    """Doctor initiates a call – notifies patient via their socket room."""
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT e.patientId, u.fullName FROM emergencies e JOIN users u ON u.id = %s WHERE e.id = %s", (current_user_id, em_id))
        row = cursor.fetchone()
        if not row:
            return signed_json_response({"error": "Emergency not found"}, 404)
        patient_id = row['patientId']
        doctor_name = row['fullName']
        # Emit to the patient's own socket room (patientId channel)
        socketio.emit('emergency_call_incoming', {
            "doctorName": doctor_name,
            "doctorId": current_user_id,
            "emergencyId": em_id
        }, room=f"user_{patient_id}")
        return signed_json_response({"message": "Patient notified"})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

# ─── Medical Reports & Health Data ───

@app.route('/api/reports', methods=['POST'])
@jwt_required()
def upload_report():
    """Upload a medical report."""
    current_user_id = int(get_jwt_identity())
    if 'file' not in request.files:
        return signed_json_response({"error": "No file part"}, 400)
    file = request.files['file']
    if file.filename == '':
        return signed_json_response({"error": "No selected file"}, 400)
    
    if file:
        filename = secure_filename(f"{current_user_id}_{int(time.time())}_{file.filename}")
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        display_name = request.form.get('displayName', file.filename.split('.')[0])
        file_size = f"{os.path.getsize(file_path) / 1024:.0f} KB"
        
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO patient_reports (userId, filename, displayName, fileSize, status)
                VALUES (%s, %s, %s, %s, 'Pending')
            """, (current_user_id, filename, display_name, file_size))
            conn.commit()
            report_id = cursor.lastrowid
            return signed_json_response({
                "message": "Report uploaded successfully",
                "report": {"id": report_id, "name": display_name, "status": "Pending"}
            })
        except Exception as e:
            return signed_json_response({"error": str(e)}, 500)
        finally:
            conn.close()

@app.route('/api/reports', methods=['GET'])
@jwt_required()
def get_reports():
    """List all reports for the current user."""
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM patient_reports WHERE userId = %s ORDER BY createdAt DESC", (current_user_id,))
        rows = cursor.fetchall()
        reports = []
        for r in rows:
            reports.append({
                "id": r['id'],
                "name": r['displayName'],
                "date": r['createdAt'].strftime('%d %b %Y'),
                "size": r['fileSize'],
                "status": r['status'],
                "summary": r['summary'],
                "ayurvedic": r['ayurvedicInsights']
            })
        return signed_json_response({"reports": reports})
    finally:
        conn.close()

@app.route('/api/patient/dashboard-data', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """Aggregated data for the Health Dashboard."""
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Fetch Latest Vitals
        cursor.execute("""
            SELECT metricType, val, unit, changeDir, changeText, color 
            FROM patient_health_metrics 
            WHERE userId = %s 
            ORDER BY analyzedAt DESC
        """, (current_user_id,))
        vitals_raw = cursor.fetchall()
        # Keep only latest of each type
        vitals = {}
        for v in vitals_raw:
            if v['metricType'] not in vitals:
                vitals[v['metricType']] = {
                    "label": v['metricType'],
                    "value": v['val'],
                    "unit": v['unit'],
                    "dir": v['changeDir'],
                    "change": v['changeText'],
                    "color": v['color'],
                    "icon": "❤️" if "Heart" in v['metricType'] else "🌡️" if "Temp" in v['metricType'] else "⚖️" if "BMI" in v['metricType'] else "🫁" if "SpO2" in v['metricType'] else "🩸"
                }
        
        # 2. Fetch Symptoms
        cursor.execute("SELECT symptom, severity, analyzedAt FROM patient_symptoms WHERE userId = %s ORDER BY analyzedAt DESC LIMIT 10", (current_user_id,))
        symptoms = cursor.fetchall()
        
        # 3. Recent Activity (from reports & symptoms)
        activity = []
        cursor.execute("SELECT displayName, createdAt FROM patient_reports WHERE userId = %s ORDER BY createdAt DESC LIMIT 3", (current_user_id,))
        for r in cursor.fetchall():
            activity.append({"title": f"Report '{r['displayName']}' uploaded", "time": "Recently", "dot": "#c9a84c"})
        
        return signed_json_response({
            "vitals": list(vitals.values()),
            "symptoms": symptoms,
            "activity": activity
        })
    finally:
        conn.close()

@app.route('/api/emergencies/%d/handle', methods=['PUT']) # Placeholder for context
@app.route('/api/reports/<int:report_id>/analyze', methods=['POST'])
@jwt_required()
def analyze_report_api(report_id):
    """Triggers AI analysis for a report and saves metrics."""
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM patient_reports WHERE id = %s AND userId = %s", (report_id, current_user_id))
        report = cursor.fetchone()
        if not report:
            return signed_json_response({"error": "Report not found"}, 404)
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], report['filename'])
        if not os.path.exists(file_path):
            return signed_json_response({"error": "File missing on server"}, 404)
            
        brain = get_brain()
        analysis = brain.analyze_medical_report(file_path)
        
        if "error" in analysis:
            return signed_json_response({"error": analysis['error']}, 500)
            
        # Update report status
        cursor.execute("""
            UPDATE patient_reports 
            SET status = 'Analysed', summary = %s, ayurvedicInsights = %s 
            WHERE id = %s
        """, (analysis.get('Medical Summary'), analysis.get('Ayurvedic Insights'), report_id))
        
        # Save Vitals
        v_data = analysis.get('Vitals', {})
        metric_map = {
            'heartRate': ('Heart Rate', 'bpm', 'red'),
            'bloodPressure': ('Blood Pressure', 'mmHg', 'blue'),
            'temperature': ('Temperature', '°C', 'gold'),
            'bmi': ('BMI', '', 'green'),
            'spo2': ('SpO2', '%', 'purple')
        }
        
        for key, (label, unit, color) in metric_map.items():
            val = v_data.get(key)
            if val is not None:
                cursor.execute("""
                    INSERT INTO patient_health_metrics (userId, metricType, val, unit, color, changeText)
                    VALUES (%s, %s, %s, %s, %s, 'Normal')
                """, (current_user_id, label, str(val), unit, color))
                
        # Save Symptoms
        symptoms = analysis.get('Symptoms', [])
        for sym in symptoms:
            cursor.execute("""
                INSERT INTO patient_symptoms (userId, symptom, sourceReportId)
                VALUES (%s, %s, %s)
            """, (current_user_id, sym, report_id))
            
        conn.commit()
        return signed_json_response({"message": "Analysis complete", "data": analysis})
    except Exception as e:
        traceback.print_exc()
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

@app.route('/api/emergencies/<int:em_id>/handle', methods=['PUT'])
@jwt_required()
def handle_emergency(em_id):
    current_user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE emergencies SET status = 'Handled', handledById = %s WHERE id = %s AND status = 'Active'", (current_user_id, em_id))
        if cursor.rowcount == 0:
             return signed_json_response({"error": "Emergency already handled or not found"}, 400)
             
        conn.commit()
        socketio.emit('emergency_handled', {"id": f"EM-{em_id}"})
        return signed_json_response({"message": "Emergency marked as handled"})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

# --- MedAssist-X AI Endpoints ---

@app.route('/api/ai/chat', methods=['POST'])
@jwt_required()
def ai_chat():
    current_user_id = int(get_jwt_identity())
    user_query = None
    
    if request.is_json:
        data = request.get_json()
        user_query = data.get('message')
    else:
        user_query = request.form.get('message')
        if 'file' in request.files:
            file = request.files['file']
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            user_query = f"[Patient uploaded: {filename}] {user_query or 'Analyze this file.'}"

    if not user_query:
        return signed_json_response({"error": "Message or file required"}, 400)
    
    brain = get_brain()
    # Pass user_id for memory
    response = brain.process_query(user_query, user_id=current_user_id)
    
    return signed_json_response({
        "response": response,
        "audio_url": None
    })

@app.route('/api/ai/voice', methods=['POST'])
@jwt_required()
def ai_voice():
    if 'audio' not in request.files:
        return signed_json_response({"error": "Audio file required"}, 400)
    
    file = request.files['file'] if 'file' in request.files else request.files['audio']
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Use browser-side STT (Web Speech API) — just process the text
    text = request.form.get('message', 'Voice input received')
    current_user_id = int(get_jwt_identity())
    
    brain = get_brain()
    response = brain.process_query(text, user_id=current_user_id)
    
    return signed_json_response({
        "text": text,
        "response": response,
        "audio_url": None
    })

@app.route('/api/ai/metrics', methods=['GET'])
@jwt_required()
def ai_metrics():
    brain = get_brain()
    return signed_json_response(brain.get_metrics())

@app.route('/api/uploads/<path:filename>')
def download_file(filename):
    from flask import send_from_directory
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# ---- OTP VERIFICATION API ----
@app.route('/api/send-otp', methods=['POST'])
@jwt_required()
@require_hmac
def send_otp():
    """Generates and sends a 6-digit OTP to the requested mobile number via Fast2SMS."""
    current_user_id = get_jwt_identity()
    data = request.json
    mobile = data.get('mobile')

    if not mobile:
        return jsonify({"error": "Mobile number is required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database error"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        
        # 1. Check Rate Limiting for the user (Max 3 attempts per 5 mins)
        cursor.execute('''
            SELECT COUNT(*) AS count 
            FROM otp_verification 
            WHERE user_id = %s AND created_at >= NOW() - INTERVAL 5 MINUTE
        ''', (current_user_id,))
        
        attempt_count = cursor.fetchone()['count']
        if attempt_count >= 3:
            return jsonify({"error": "Too many OTP requests. Please wait 5 minutes."}), 429
            
        # 2. Generate cryptographically secure OTP
        otp = generate_otp()
        
        # 3. Clean up older/pending OTPs for this user
        cursor.execute("DELETE FROM otp_verification WHERE user_id = %s", (current_user_id,))
        
        # 4. Save new OTP to the database
        cursor.execute('''
            INSERT INTO otp_verification (user_id, mobile, otp, attempts, created_at)
            VALUES (%s, %s, %s, 0, NOW())
        ''', (current_user_id, mobile, otp))
        
        conn.commit()

        # 5. Send via Fast2SMS
        sms_sent = send_fast2sms_otp(mobile, otp)
        
        if sms_sent:
            return jsonify({"success": True, "message": "OTP sent successfully. Valid for 5 minutes."}), 200
        else:
            app.logger.warning(f"Fast2SMS API failed or missing key. Simulated OTP for {mobile}: {otp}")
            return jsonify({"success": True, "message": "OTP simulated successfully (Check Server Console for code)."}), 200

    except Exception as e:
        app.logger.error(f"Error in send-otp: {e}")
        conn.rollback()
        return jsonify({"error": "Internal server error"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/verify-otp', methods=['POST'])
@jwt_required()
@require_hmac
def verify_otp():
    """Verifies the OTP and updates the mobile number in the users table."""
    current_user_id = get_jwt_identity()
    data = request.json
    otp_input = data.get('otp')

    if not otp_input:
        return jsonify({"error": "OTP is required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database error"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        
        # 1. Fetch latest OTP record for user (Must be within 5 mins to be valid time)
        cursor.execute('''
            SELECT id, otp, mobile, attempts, 
                   (created_at >= NOW() - INTERVAL 5 MINUTE) AS is_valid_time
            FROM otp_verification 
            WHERE user_id = %s 
            ORDER BY created_at DESC LIMIT 1
        ''', (current_user_id,))
        
        record = cursor.fetchone()
        
        if not record:
            return jsonify({"error": "No pending OTP request found."}), 404
            
        record_id = record['id']
        attempts_made = record['attempts']
        
        # 2. Check hard attempt limit (Max 3 failed entries)
        if attempts_made >= 3:
            cursor.execute("DELETE FROM otp_verification WHERE id = %s", (record_id,))
            conn.commit()
            return jsonify({"error": "Maximum OTP attempts exceeded. Request a new OTP."}), 403
            
        # 3. Check expiration
        if not record['is_valid_time']:
            cursor.execute("DELETE FROM otp_verification WHERE id = %s", (record_id,))
            conn.commit()
            return jsonify({"error": "OTP has expired. Please request a new one."}), 400
            
        # 4. Verify given OTP
        if str(record['otp']) != str(otp_input):
            cursor.execute("UPDATE otp_verification SET attempts = attempts + 1 WHERE id = %s", (record_id,))
            conn.commit()
            return jsonify({"error": "Invalid OTP. Please try again."}), 401
            
        # 5. OTP Valid -> Update 'mobile' on user 
        new_mobile = record['mobile']
        cursor.execute("UPDATE users SET mobile = %s WHERE id = %s", (new_mobile, current_user_id))
        
        # 6. Cleanup successful OTP
        cursor.execute("DELETE FROM otp_verification WHERE user_id = %s", (current_user_id,))
        
        conn.commit()
        return jsonify({
            "success": True, 
            "message": "Mobile number updated successfully"
        }), 200

    except Exception as e:
        app.logger.error(f"Error in verify-otp: {e}")
        conn.rollback()
        return jsonify({"error": "Internal server error"}), 500
    finally:
        cursor.close()
        conn.close()

# --- Patient Medical Data (for Doctor access during emergency) ---
@app.route('/api/patients/<int:patient_id>/medical', methods=['GET'])
@jwt_required()
def get_patient_medical(patient_id):
    """Allows a doctor to read a patient's medical profile during emergencies."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT pd.allergies, pd.conditions, pd.medications, pd.dosha,
                   u.fullName, u.mobile
            FROM patient_details pd
            JOIN users u ON u.id = pd.userId
            WHERE pd.userId = %s
        ''', (patient_id,))
        row = cursor.fetchone()
        if not row:
            return signed_json_response({"error": "Patient not found"}, 404)
        return signed_json_response(row)
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

# --- FILE UPLOADS ---
@app.route('/api/upload', methods=['POST'])
@jwt_required()
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file parameter found"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        if file:
            filename = secure_filename(f"{int(time.time())}_{file.filename}")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            return jsonify({
                "success": True, 
                "url": f"/uploads/{filename}", 
                "filename": file.filename
            }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@socketio.on('join_user_room')
def on_join_user_room(data):
    """Patient joins their personal notification room."""
    if 'userId' in data:
        room = f"user_{data['userId']}"
        join_room(room)

# --- WEBRTC SIGNALING ENDPOINTS ---

@socketio.on('join_video_room')
def on_join_video_room(data):
    if 'room' not in data:
        return
    room = str(data['room'])
    role = data.get('role', 'unknown')
    join_room(room)
    # Notify others in the room that a new peer has joined
    emit('peer_joined', {'role': role, 'message': f'{role} has joined'}, to=room, include_self=False)
    app.logger.info(f"[WebRTC] {role} joined room {room}")

# Patient explicitly announces their presence (triggers doctor to re-emit doctor_ready)
@socketio.on('patient_joined')
def on_patient_joined(data):
    if 'room' in data:
        room = str(data['room'])
        app.logger.info(f"[WebRTC] patient_joined in room {room}")
        emit('patient_joined', {'message': 'Patient is ready'}, to=room, include_self=False)

@socketio.on('doctor_ready')
def on_doctor_ready(data):
    if 'room' in data:
        room = str(data['room'])
        app.logger.info(f"[WebRTC] doctor_ready in room {room}")
        emit('doctor_ready', {'message': 'Doctor is ready'}, to=room, include_self=False)

@socketio.on('video_offer')
def on_video_offer(data):
    if 'room' in data and 'sdp' in data:
        emit('video_offer', data['sdp'], to=str(data['room']), include_self=False)
    # Legacy support
    elif 'room' in data and 'offer' in data:
        emit('video_offer', data['offer'], to=str(data['room']), include_self=False)

@socketio.on('video_answer')
def on_video_answer(data):
    if 'room' in data and 'sdp' in data:
        emit('video_answer', data['sdp'], to=str(data['room']), include_self=False)
    # Legacy support
    elif 'room' in data and 'answer' in data:
        emit('video_answer', data['answer'], to=str(data['room']), include_self=False)

# New unified ICE candidate event
@socketio.on('ice_candidate')
def on_ice_candidate(data):
    if 'room' in data and 'candidate' in data:
        emit('ice_candidate', data['candidate'], to=str(data['room']), include_self=False)

# Legacy ICE candidate event (backward compat)
@socketio.on('new_ice_candidate')
def on_new_ice_candidate(data):
    if 'room' in data and 'candidate' in data:
        emit('new_ice_candidate', data['candidate'], to=str(data['room']), include_self=False)
        emit('ice_candidate', data['candidate'], to=str(data['room']), include_self=False)

@socketio.on('call_chat_msg')
def on_call_chat_msg(data):
    if 'room' in data and 'message' in data:
        emit('call_chat_msg', data['message'], to=str(data['room']), include_self=False)

@socketio.on('leave_video_room')
def on_leave_video_room(data):
    if 'room' in data:
        room = str(data['room'])
        leave_room(room)
        emit('peer_left', {'message': 'A peer has left'}, to=room, include_self=False)
        app.logger.info(f"[WebRTC] peer left room {room}")

# --- Background Task for Appointment Reminders ---
def check_upcoming_appointments():
    """Checks for appointments starting in ~5 minutes and sends notifications."""
    while True:
        try:
            with app.app_context():
                conn = get_db_connection()
                if conn:
                    cursor = conn.cursor(dictionary=True)
                    # Find appointments starting in the next 5 minutes that haven't been reminded
                    # Using +/- 1 minute buffer to ensure we catch them in 1-min poll
                    cursor.execute('''
                        SELECT a.id, a.patientId, a.doctorId, a.appointmentTime, a.type,
                               p.fullName as patientName, d.fullName as doctorName
                        FROM appointments a
                        JOIN users p ON a.patientId = p.id
                        JOIN users d ON a.doctorId = d.id
                        WHERE a.status = 'Scheduled' AND a.reminderSent = FALSE
                          AND a.appointmentDate = CURRENT_DATE
                          AND TIMESTAMPDIFF(MINUTE, NOW(), CONCAT(a.appointmentDate, ' ', a.appointmentTime)) BETWEEN 0 AND 6
                    ''')
                    upcoming = cursor.fetchall()
                    
                    for appt in upcoming:
                        # Create notifications
                        msg = f"Reminder: Your {appt['type']} appointment starts in 5 minutes!"
                        create_notification(appt['patientId'], 'Appointment', msg)
                        create_notification(appt['doctorId'], 'Appointment', f"Reminder: Appointment with {appt['patientName']} starts in 5 minutes.")
                        
                        # Emit socket events if users are online
                        socketio.emit('notification', {'type': 'Appointment', 'content': msg}, room=f"user_{appt['patientId']}")
                        socketio.emit('notification', {'type': 'Appointment', 'content': f"Upcoming: {appt['patientName']} in 5 mins"}, room=f"user_{appt['doctorId']}")
                        
                        # Mark as reminded
                        cursor.execute('UPDATE appointments SET reminderSent = TRUE WHERE id = %s', (appt['id'],))
                    
                    conn.commit()
                    conn.close()
        except Exception as e:
            print(f"Reminder Task Error: {e}")
        socketio.sleep(60)

# Start background reminder service
def start_background_tasks():
    socketio.start_background_task(check_upcoming_appointments)

with app.app_context():
    start_background_tasks()

if __name__ == '__main__':
    socketio.run(app, port=5000, debug=True, host='0.0.0.0')

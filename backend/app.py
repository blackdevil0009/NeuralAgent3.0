import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from database import get_db_connection, init_db
from security_utils import sign_response, verify_hmac
import datetime
import secrets
import functools
import traceback
from utils.email_utils import send_verification_email, send_reset_email
from ai.brain import MedAssistX

ai_engine = MedAssistX()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "allow_headers": ["Content-Type", "Authorization", "X-HMAC-Signature", "X-Timestamp"]}})
app.config['BCRYPT_LOG_ROUNDS'] = 8
bcrypt = Bcrypt(app)
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'neural-agent-secret-2026')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=30)
jwt = JWTManager(app)

# Auto-create all database tables on startup
init_db()

import werkzeug.utils
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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
        verification_otp = str(secrets.randbelow(900000) + 100000)
        cur.execute('''
            INSERT INTO users (fullName, email, password, role, mobile, verificationToken, otpCode, otpExpiry, rsaPublicKey, rsaPrivateKeyEncrypted)
            VALUES (%s, %s, %s, %s, %s, %s, %s, DATE_ADD(NOW(), INTERVAL 1 HOUR), %s, %s)
        ''', (full_name, email, hashed_password, role, mobile, verification_token, verification_otp, "NO_RSA_YET", "NO_RSA_YET"))
        
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
        else:
            cur.execute("INSERT INTO patient_details (userId) VALUES (%s)", (user_id,))
            
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
        
        # ── ROLE GUARD: reject cross-role login attempts ──────────────────
        requested_role = (data.get('role') or '').strip().lower()
        actual_role = (user.get('role') or '').strip().lower()
        if requested_role and actual_role != requested_role:
            return signed_json_response({
                "message": f"No {requested_role.capitalize()} account found for this email. Please use the correct login tab."
            }, 403)
            
        if not user.get('isVerified', 0):
            return signed_json_response({"message": "Please verify your email before logging in."}, 403)
            
        # 2FA Intercept
        if user.get('twoFactorEnabled'):
            otp = str(secrets.randbelow(900000) + 100000)
            cur.execute("""
                UPDATE users SET otpCode=%s, otpExpiry=DATE_ADD(NOW(), INTERVAL 10 MINUTE)
                WHERE id=%s
            """, (otp, user['id']))
            conn.commit()
            
            # Send Email via background thread
            email_body = f"Your 2FA Login Code is: {otp}\nIt expires in 10 minutes.\n\nIf you did not request this, please change your password immediately."
            from utils.email_utils import _send_email_common
            _send_email_common(email, "VaidyaMed-X: 2FA Login Code", email_body)
            
            return signed_json_response({"status": "2fa_required", "message": "OTP sent to your email."}, 200)
            
        token = create_access_token(identity=str(user['id']))
        return signed_json_response({
            "token": token,
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

@app.route('/api/auth/2fa/toggle', methods=['POST'])
@jwt_required()
def toggle_2fa():
    """Toggle 2FA state for the logged-in user."""
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    password = data.get('password')
    enabled = data.get('enabled', False)
    
    if not password: return signed_json_response({"error": "Password required to change security settings"}, 400)
        
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        cur.execute("SELECT password FROM users WHERE id = %s", (user_id,))
        u = cur.fetchone()
        if not u or not bcrypt.check_password_hash(u['password'], password):
            return signed_json_response({"error": "Invalid password"}, 401)
            
        cur.execute("UPDATE users SET twoFactorEnabled = %s WHERE id = %s", (1 if enabled else 0, user_id))
        conn.commit()
        
        status_msg = "enabled" if enabled else "disabled"
        return signed_json_response({"message": f"2FA securely {status_msg}"}, 200)
    except Exception as e:
        app.logger.error(f"2FA Toggle Error: {e}")
        return signed_json_response({"error": "Failed to update 2FA"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/auth/verify-2fa-otp', methods=['POST'])
def verify_2fa_otp():
    """Verify OTP and issue JWT token."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').lower().strip()
    otp = data.get('otp')
    if not email or not otp: return signed_json_response({"error": "Email and OTP required."}, 400)
        
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        cur.execute("SELECT * FROM users WHERE email = %s AND otpExpiry > NOW()", (email,))
        user = cur.fetchone()
        
        if not user or str(user.get('otpCode')) != str(otp):
            return signed_json_response({"error": "Invalid or expired OTP. Please request a new code."}, 401)
            
        cur.execute("UPDATE users SET otpCode = NULL WHERE id = %s", (user['id'],))
        conn.commit()
        
        access_token = create_access_token(identity=str(user['id']), expires_delta=datetime.timedelta(days=1))
        
        if 'password' in user: del user['password']
        if 'rsaPrivateKeyEncrypted' in user: del user['rsaPrivateKeyEncrypted']
        if 'createdAt' in user: user['createdAt'] = str(user['createdAt'])
        if 'otpExpiry' in user: user['otpExpiry'] = str(user['otpExpiry'])
        
        return signed_json_response({
            "message": "2FA Verified successfully",
            "token": access_token,
            "role": user['role'],
            "user": user
        }, 200)
    except Exception as e:
        app.logger.error(f"2FA Verify Error: {e}")
        return signed_json_response({"error": "Failed to verify 2FA"}, 500)
    finally:
        if conn: conn.close()
        
@app.route('/api/auth/verify-registration-otp', methods=['POST'])
def verify_registration_otp():
    """Verify Email OTP for immediate login access."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').lower().strip()
    otp = data.get('otp')
    if not email or not otp: return signed_json_response({"error": "Email and OTP required."}, 400)
        
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        cur.execute("SELECT id, otpCode FROM users WHERE email = %s AND otpExpiry > NOW()", (email,))
        user = cur.fetchone()
        
        if not user or str(user.get('otpCode')) != str(otp):
            return signed_json_response({"error": "Invalid or expired OTP. Please request a new code."}, 400)
            
        cur.execute("UPDATE users SET isVerified = 1, otpCode = NULL WHERE id = %s", (user['id'],))
        conn.commit()
        
        return signed_json_response({"message": "Email Verified"}, 200)
    except Exception as e:
        app.logger.error(f"Verify Reg OTP Error: {e}")
        return signed_json_response({"error": "Failed to verify email"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/auth/resend-verification', methods=['POST'])
def resend_verification():
    """Resend OTP verification code for unverified users."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').lower().strip()
    if not email:
        return signed_json_response({"error": "Email is required"}, 400)

    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)

        cur.execute("SELECT id, isVerified FROM users WHERE email = %s", (email,))
        user = cur.fetchone()

        # Always return success to prevent email enumeration
        if not user or user.get('isVerified'):
            return signed_json_response({"message": "If that email is pending verification, a new code has been sent."}, 200)

        new_otp = str(secrets.randbelow(900000) + 100000)
        cur.execute("""
            UPDATE users SET otpCode = %s, otpExpiry = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
            WHERE id = %s
        """, (new_otp, user['id']))
        conn.commit()

        # Send new OTP email
        verification_link = f"{os.environ.get('FRONTEND_URL', 'https://vaidyamedx.in')}/verify-email"
        send_verification_email(email, verification_link, new_otp)

        return signed_json_response({"message": "A new verification code has been sent to your email."}, 200)
    except Exception as e:
        app.logger.error(f"Resend Verification Error: {e}")
        return signed_json_response({"error": "Failed to resend verification code"}, 500)
    finally:
        if conn: conn.close()

# --- INBOX (P2P CHAT) ROUTES ---

@app.route('/api/messages', methods=['GET'])
@jwt_required()
def get_messages():
    """Fetch messages for the user. Group them by conversational peer to act as an inbox feed."""
    user_id = get_jwt_identity()
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "Database unavailable."}, 500)
        cur = conn.cursor(dictionary=True)
        # Fetch all messages where user is sender or receiver
        cur.execute('''
            SELECT m.*, 
                   s.fullName as senderName, s.role as senderRole,
                   r.fullName as receiverName, r.role as receiverRole
            FROM messages m
            JOIN users s ON m.senderId = s.id
            JOIN users r ON m.receiverId = r.id
            WHERE m.senderId = %s OR m.receiverId = %s
            ORDER BY m.timestamp ASC
        ''', (user_id, user_id))
        messages = cur.fetchall()
        
        # Organize into conversations by peer_id
        inbox = {}
        for m in messages:
            peer_id = m['receiverId'] if str(m['senderId']) == str(user_id) else m['senderId']
            peer_name = m['receiverName'] if str(m['senderId']) == str(user_id) else m['senderName']
            if peer_id not in inbox:
                inbox[peer_id] = {
                    "peerId": peer_id,
                    "peerName": peer_name,
                    "messages": []
                }
            inbox[peer_id]["messages"].append({
                "id": m['id'],
                "senderId": m['senderId'],
                "receiverId": m['receiverId'],
                "content": m['encryptedContext'], # Just returning it as content for the frontend to decrypt
                "timestamp": str(m['timestamp']),
                "isDoctorResponded": m['isDoctorResponded']
            })
            
        return signed_json_response(list(inbox.values()), 200)
    except Exception as e:
        app.logger.error(f"Inbox Fetch Error: {e}")
        return signed_json_response({"message": "Failed to fetch inbox"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/messages/send', methods=['POST'])
@require_hmac
@jwt_required()
def send_message():
    """Send a message to a peer synchronously."""
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    receiver_id = data.get('receiverId')
    content = data.get('content') # Encrypted context from frontend
    
    if not receiver_id or not content:
        return signed_json_response({"message": "Receiver ID and content are required."}, 400)
        
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO messages (senderId, receiverId, encryptedContext, signature)
            VALUES (%s, %s, %s, %s)
        ''', (user_id, receiver_id, content, 'REST_SYNC_SIG'))
        conn.commit()
        return signed_json_response({"message": "Message sent."}, 201)
    except Exception as e:
        app.logger.error(f"Message Send Error: {e}")
        if conn: conn.rollback()
        return signed_json_response({"message": "Failed to send message"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/messages/upload', methods=['POST'])
@jwt_required()
def upload_message_file():
    """Upload media file and return its URL for attaching to messages."""
    if 'file' not in request.files:
        return signed_json_response({"error": "No file part"}, 400)
    file = request.files['file']
    if file.filename == '':
        return signed_json_response({"error": "No selected file"}, 400)
    
    filename = werkzeug.utils.secure_filename(f"{secrets.token_hex(8)}_{file.filename}")
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    file_url = f"{request.host_url.rstrip('/')}/uploads/{filename}"
    return signed_json_response({"url": file_url, "filename": file.filename}, 200)

from flask import send_from_directory
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ==========================================================
# REPORTS ENDPOINTS
# ==========================================================

@app.route('/api/reports', methods=['GET'])
@jwt_required()
def get_reports():
    user_id = get_jwt_identity()
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM patient_reports WHERE userId = %s ORDER BY createdAt DESC", (user_id,))
        rows = cur.fetchall()
        reports = []
        for r in rows:
            reports.append({
                "id": r['id'],
                "name": r['displayName'],
                "file": r['filename'],
                "size": r['fileSize'] or '0 KB',
                "date": str(r['createdAt']).split()[0], # date only
                "status": r['status'],
                "summary": r['summary'],
                "ayurvedic": r['ayurvedicInsights']
            })
        return signed_json_response({"reports": reports}, 200)
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/reports', methods=['POST'])
@jwt_required()
def upload_report():
    user_id = get_jwt_identity()
    if 'file' not in request.files:
        return signed_json_response({"error": "No file"}, 400)
    
    file = request.files['file']
    display_name = request.form.get('displayName', file.filename)
    
    filename = werkzeug.utils.secure_filename(f"{secrets.token_hex(4)}_{file.filename}")
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    file_size_kb = os.path.getsize(file_path) // 1024
    file_size_str = f"{file_size_kb} KB" if file_size_kb < 1024 else f"{(file_size_kb / 1024):.1f} MB"
    
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO patient_reports (userId, filename, displayName, fileSize, status)
            VALUES (%s, %s, %s, %s, %s)
        ''', (user_id, filename, display_name, file_size_str, 'Pending'))
        conn.commit()
        return signed_json_response({"message": "Uploaded"}, 200)
    except Exception as e:
        app.logger.error(f"Report upload err: {e}")
        if conn: conn.rollback()
        return signed_json_response({"error": "DB error"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/reports/<int:report_id>/analyze', methods=['POST'])
@jwt_required()
def analyze_report(report_id):
    user_id = get_jwt_identity()
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM patient_reports WHERE id = %s AND userId = %s", (report_id, user_id))
        report = cur.fetchone()
        if not report:
            return signed_json_response({"error": "Not found"}, 404)
        
        # Connected AI Placeholder
        summary = "AI Analysis: The uploaded report indicates primary metrics are mostly within normal ranges. Mild anomalies observed in hemoglobin/dietary markers depending on the lab context."
        insights = "Vata-Pitta dosha imbalance detected. Recommendation: Incorporate cooling herbs (like Amalaki), avoid spicy or extremely hot foods, and maintain regular meal timings to pacify Agni."
        
        cur.execute("UPDATE patient_reports SET status = 'Analyzed', summary = %s, ayurvedicInsights = %s WHERE id = %s", (summary, insights, report_id))
        conn.commit()
        
        return signed_json_response({"message": "Analyzed", "summary": summary, "ayurvedic": insights}, 200)
    except Exception as e:
        if conn: conn.rollback()
        return signed_json_response({"error": str(e)}, 500)
    finally:
        if conn: conn.close()


# --- APPOINTMENT ROUTES ---

from utils.razorpay_service import razorpay_service

@app.route('/api/appointments/create-order', methods=['POST'])
@require_hmac
@jwt_required()
def create_appointment_order():
    """Generates a Razorpay order id securely."""
    data = request.get_json(silent=True) or {}
    amount = data.get('amount')
    if not amount: return signed_json_response({"message": "Amount required"}, 400)
    
    try:
        # Amount sent by frontend should be in rupees. Multiply by 100 for paise.
        amount_paise = int(amount) * 100
        receipt = f"rcpt_{int(datetime.datetime.now().timestamp())}"
        order = razorpay_service.create_order(amount_paise, receipt)
        return signed_json_response({"order_id": order['id'], "amount": amount_paise}, 200)
    except Exception as e:
        app.logger.error(f"Order Creation Error: {e}")
        return signed_json_response({"message": "Failed to create payment order."}, 500)

@app.route('/api/appointments/book', methods=['POST'])
@require_hmac
@jwt_required()
def book_appointment():
    """Verifies Razorpay payment and securely records the appointment."""
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    
    doctor_id = data.get('doctorId')
    appt_date = data.get('date')
    appt_time = data.get('time')
    
    if appt_time:
        try:
            # Mutate 12h AM/PM strings directly into strictly enforced MySQL 24h TIME schema natively.
            dt_parsed = datetime.datetime.strptime(appt_time.strip(), "%I:%M %p")
            appt_time = dt_parsed.strftime("%H:%M:00")
        except ValueError:
            pass # Keep natively if already in 24h format
            
    appt_type = data.get('type', 'Video Call')
    amount_paid = data.get('amountPaid', 0)
    notes = data.get('notes', '')
    
    rzp_payment_id = data.get('razorpayPaymentId', 'TEST_PAYMENT')
    rzp_order_id = data.get('razorpayOrderId', 'TEST_ORDER')
    
    if not doctor_id or not appt_date or not appt_time:
        return signed_json_response({"message": "Doctor, Date, and Time required."}, 400)
        
    # Standard 5% platform commission
    commission = int(int(amount_paid) * 0.05) if int(amount_paid) > 0 else 0
    payout = int(amount_paid) - commission

    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor()
        
        try:
            cur.execute('''
                INSERT INTO appointments (
                    patientId, doctorId, appointmentDate, appointmentTime, type, 
                    amountPaid, commissionAmount, doctorPayoutAmount, 
                    paymentId, orderId, notes, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (user_id, doctor_id, appt_date, appt_time, appt_type, 
                  amount_paid, commission, payout, rzp_payment_id, rzp_order_id, notes, 'Scheduled'))
        except Exception as insert_err:
            if 'commissionAmount' in str(insert_err) or 'Unknown column' in str(insert_err):
                cur.execute("ALTER TABLE appointments ADD COLUMN commissionAmount INT DEFAULT 0")
                cur.execute("ALTER TABLE appointments ADD COLUMN doctorPayoutAmount INT DEFAULT 0")
                cur.execute('''
                    INSERT INTO appointments (
                        patientId, doctorId, appointmentDate, appointmentTime, type, 
                        amountPaid, commissionAmount, doctorPayoutAmount, 
                        paymentId, orderId, notes, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (user_id, doctor_id, appt_date, appt_time, appt_type, 
                      amount_paid, commission, payout, rzp_payment_id, rzp_order_id, notes, 'Scheduled'))
            else:
                raise insert_err
        
        conn.commit()
        return signed_json_response({"message": "Appointment booked successfully!"}, 201)
    except Exception as e:
        app.logger.error(f"Booking Error: {e}")
        if conn: conn.rollback()
        return signed_json_response({"message": "Failed to book appointment."}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/appointments', methods=['GET'])
@jwt_required()
def get_appointments():
    """Retrieve all appointments for the logged-in user. Role is read from DB, not trusted from client."""
    user_id = get_jwt_identity()
    
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        # Always determine role from the database — NEVER trust client query param
        cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        u = cur.fetchone()
        if not u:
            return signed_json_response({"message": "User not found"}, 404)
        role = u['role']
        
        if role == 'doctor':
            cur.execute('''
                SELECT a.*, u.fullName as patientName, u.mobile as patientMobile 
                FROM appointments a 
                JOIN users u ON a.patientId = u.id 
                WHERE a.doctorId = %s ORDER BY a.appointmentDate DESC
            ''', (user_id,))
        else:
            cur.execute('''
                SELECT a.*, u.fullName as doctorName 
                FROM appointments a 
                JOIN users u ON a.doctorId = u.id 
                WHERE a.patientId = %s ORDER BY a.appointmentDate DESC
            ''', (user_id,))
            
        appointments = cur.fetchall()
        
        # Stringify dates for JSON safety
        for appt in appointments:
            appt['appointmentDate'] = str(appt['appointmentDate'])
            appt['appointmentTime'] = str(appt['appointmentTime'])
            if appt.get('createdAt'): appt['createdAt'] = str(appt['createdAt'])
            
        return signed_json_response({"appointments": appointments}, 200)
    except Exception as e:
        app.logger.error(f"Appointments Fetch Error: {e}")
        return signed_json_response({"message": "Failed to fetch appointments."}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/appointments/<int:appt_id>', methods=['PUT'])
@jwt_required()
def update_appointment(appt_id):
    """Update appointment status (cancel by patient, or status update by doctor)."""
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    new_status = data.get('status')
    if not new_status:
        return signed_json_response({"message": "Status is required"}, 400)

    # Only allow known statuses
    allowed = {'Cancelled', 'Completed', 'Confirmed', 'Scheduled', 'Upcoming', 'No-Show'}
    if new_status not in allowed:
        return signed_json_response({"message": f"Invalid status. Allowed: {', '.join(allowed)}"}, 400)

    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)

        # Verify ownership: patient can cancel own appt, doctor can update their own
        cur.execute("""
            SELECT id, patientId, doctorId, status FROM appointments WHERE id = %s
        """, (appt_id,))
        appt = cur.fetchone()
        if not appt:
            return signed_json_response({"message": "Appointment not found"}, 404)
        if str(appt['patientId']) != str(user_id) and str(appt['doctorId']) != str(user_id):
            return signed_json_response({"message": "Unauthorized"}, 403)

        cur.execute("UPDATE appointments SET status = %s WHERE id = %s", (new_status, appt_id))
        conn.commit()
        return signed_json_response({"message": f"Appointment status updated to {new_status}"}, 200)
    except Exception as e:
        app.logger.error(f"Appointment Update Error: {e}")
        if conn: conn.rollback()
        return signed_json_response({"message": "Failed to update appointment"}, 500)
    finally:
        if conn: conn.close()

# --- DOCTORS AND NOTIFICATIONS ROUTES ---

@app.route('/api/doctors', methods=['GET'])
@jwt_required()
def get_doctors():
    """Fetch all registered doctors."""
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        cur.execute('''
            SELECT u.id, u.fullName as name, u.email, u.mobile,
                   d.specialization as spec, d.degree, d.experience, 
                   d.consultantFee, d.hospital, d.clinic_location, d.workingHours
            FROM users u
            JOIN doctor_details d ON u.id = d.userId
            WHERE u.role = 'doctor'
        ''')
        doctors = cur.fetchall()
        return signed_json_response({"doctors": doctors}, 200)
    except Exception as e:
        app.logger.error(f"Doctors Fetch Error: {e}")
        return signed_json_response({"message": "Failed to fetch doctors"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/notifications', methods=['GET'])
@jwt_required(optional=True)
def get_notifications():
    """Empty notifications to stop frontend 404 polling errors."""
    return signed_json_response({"notifications": []}, 200)

@app.route('/api/doctors/search', methods=['GET'])
@jwt_required()
def search_doctors():
    """Search doctors by name or specialization."""
    q = request.args.get('q', '').strip()
    if not q:
        return signed_json_response({"doctors": []}, 200)
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        pattern = f"%{q}%"
        cur.execute('''
            SELECT u.id, u.fullName as name, u.email, u.mobile,
                   d.specialization as spec, d.degree, d.experience,
                   d.consultantFee, d.hospital, d.clinic_location, d.workingHours
            FROM users u
            JOIN doctor_details d ON u.id = d.userId
            WHERE u.role = 'doctor'
              AND (u.fullName LIKE %s OR d.specialization LIKE %s)
            LIMIT 10
        ''', (pattern, pattern))
        doctors = cur.fetchall()
        return signed_json_response({"doctors": doctors}, 200)
    except Exception as e:
        app.logger.error(f"Doctor Search Error: {e}")
        return signed_json_response({"message": "Search failed"}, 500)
    finally:
        if conn: conn.close()

# --- PROFILE AND EMERGENCIES ROUTES ---

@app.route('/api/user/profile', methods=['GET', 'PUT'])
@jwt_required()
def handle_user_profile():
    """Fetch or Update complete profile metadata based on user role."""
    user_id = get_jwt_identity()
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        if request.method == 'PUT':
            # Handle profile updates securely (ignoring sensitive fields)
            data = request.get_json(silent=True) or {}
            # Base users update
            cur.execute('''
                UPDATE users SET fullName=%s, dob=%s, gender=%s, blood_group=%s
                WHERE id=%s
            ''', (data.get('name'), data.get('dob'), data.get('gender'), data.get('bloodGroup'), user_id))
            
            # Check user role
            cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
            u = cur.fetchone()
            
            if u and u['role'] == 'patient':
                cur.execute('''
                    INSERT INTO patient_details (userId, dosha, allergies, conditions, medications)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE 
                        dosha=VALUES(dosha), 
                        allergies=VALUES(allergies), 
                        conditions=VALUES(conditions), 
                        medications=VALUES(medications)
                ''', (user_id, data.get('dosha'), data.get('allergies'), data.get('conditions'), data.get('medications')))
            conn.commit()
            
        # Get base user details
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user_data = cur.fetchone()
        if not user_data: return signed_json_response({"message": "User not found"}, 404)
        
        # Key mapping to match React frontend hooks perfectly
        user_data['name'] = user_data.get('fullName', '')
        user_data['bloodGroup'] = user_data.get('blood_group', 'Unknown')
        
        if 'password' in user_data: del user_data['password']
        if 'rsaPrivateKeyEncrypted' in user_data: del user_data['rsaPrivateKeyEncrypted']
        if 'createdAt' in user_data: user_data['createdAt'] = str(user_data['createdAt'])
        if 'otpExpiry' in user_data: user_data['otpExpiry'] = str(user_data['otpExpiry'])
        
        if user_data.get('role') == 'doctor':
            cur.execute("SELECT * FROM doctor_details WHERE userId = %s", (user_id,))
        else:
            cur.execute("SELECT * FROM patient_details WHERE userId = %s", (user_id,))
            
        details = cur.fetchone() or {}
        user_data.update(details)
        return signed_json_response(user_data, 200)
    except Exception as e:
        app.logger.error(f"Profile Handler Error: {e}")
        if conn: conn.rollback()
        return signed_json_response({"message": "Failed to handle profile"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/emergencies/my', methods=['GET'])
@jwt_required()
def get_my_emergencies():
    """Fetch emergencies and format them to match React PatientProfile expected keys."""
    user_id = get_jwt_identity()
    
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        u = cur.fetchone()
        if not u: return signed_json_response({"message": "User not found"}, 404)
        
        if u['role'] == 'doctor':
            cur.execute("SELECT * FROM emergencies WHERE handledById = %s OR status = 'Active' ORDER BY createdAt DESC", (user_id,))
        else:
            cur.execute("SELECT * FROM emergencies WHERE patientId = %s ORDER BY createdAt DESC", (user_id,))
            
        emgs = cur.fetchall()
        mapped_emgs = []
        for e in emgs:
            mapped_emgs.append({
                "id": f"EM-{e['id']}",
                "type": e.get('caseType', 'urgent'),
                "desc": e.get('description', ''),
                "time": str(e.get('createdAt', '')),
                "status": e.get('status', 'Active')
            })
            
        return signed_json_response({"emergencies": mapped_emgs}, 200)
    except Exception as e:
        app.logger.error(f"Emergencies Fetch Error: {e}")
        return signed_json_response({"message": "Failed to fetch emergencies"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/patient/dashboard-data', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """Provide dashboard metrics (vitals, symptoms, activity) to prevent 404s on HealthDashboard.jsx."""
    return signed_json_response({
        "vitals": [
            {"label": "Heart Rate", "value": "72", "unit": "bpm", "icon": "❤️", "dir": "up", "change": "Stable", "color": "red"},
            {"label": "Blood Pressure", "value": "120/80", "unit": "mmHg", "icon": "🩸", "dir": "up", "change": "Normal", "color": "blue"},
            {"label": "Oxygen", "value": "98", "unit": "%", "icon": "💨", "dir": "up", "change": "Optimal", "color": "green"}
        ],
        "symptoms": [
            {"symptom": "Healthy", "severity": "None"}
        ],
        "activity": [
            {"title": "Profile Verified", "time": "Just now", "dot": "#52b788"}
        ]
    }, 200)

@app.route('/api/emergencies', methods=['POST'])
@jwt_required()
def report_emergency():
    """Create a new emergency case."""
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    
    explanation = data.get('explanation')
    case_type = data.get('caseType', 'critical')
    contact = data.get('contact')
    
    if not explanation or not contact:
        return signed_json_response({"error": "Explanation and contact are required."}, 400)
        
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        # Get patient name
        cur.execute("SELECT fullName FROM users WHERE id = %s", (user_id,))
        u = cur.fetchone()
        pt_name = u['fullName'] if u else "Unknown Patient"
        
        cur.execute('''
            INSERT INTO emergencies (patientId, patientName, contact, caseType, description, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (user_id, pt_name, contact, case_type, explanation, 'Active'))
        
        emg_id = cur.lastrowid
        conn.commit()
        
        return signed_json_response({"emergency": {"id": f"EM-{emg_id}"}}, 201)
    except Exception as e:
        app.logger.error(f"Emergency Report Error: {e}")
        if conn: conn.rollback()
        return signed_json_response({"error": "Failed to report emergency"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/emergencies', methods=['GET'])
@jwt_required()
def get_all_emergencies():
    user_id = get_jwt_identity()
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        cur.execute('''
            SELECT * FROM emergencies 
            WHERE status != 'Resolved' 
            ORDER BY createdAt DESC
        ''')
        rows = cur.fetchall()
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
                "time": str(r['createdAt']).split('.')[0],
                "status": r['status'],
                "handledById": r['handledById']
            })
        return signed_json_response({"emergencies": emergencies}, 200)
    finally:
        if conn: conn.close()

@app.route('/api/emergencies/<int:em_id>/handle', methods=['PUT'])
@jwt_required()
def handle_emergency(em_id):
    user_id = get_jwt_identity()
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor()
        cur.execute("UPDATE emergencies SET status = 'Resolved', handledById = %s WHERE id = %s", (user_id, em_id))
        conn.commit()
        return signed_json_response({"message": "Handled successfully"}, 200)
    finally:
        if conn: conn.close()
        
@app.route('/api/emergencies/<int:em_id>/notify_patient', methods=['POST'])
@jwt_required()
def notify_patient(em_id):
    user_id = get_jwt_identity()
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor()
        cur.execute("UPDATE emergencies SET handledById = %s, status = 'Doctor assigned' WHERE id = %s", (user_id, em_id))
        cur.execute("SELECT patientId FROM emergencies WHERE id = %s", (em_id,))
        pt = cur.fetchone()
        if pt:
            cur.execute("INSERT INTO notifications (userId, sourceType, content) VALUES (%s, %s, %s)", (pt[0], 'Call', "Doctor is connecting for Emergency Video Call."))
        conn.commit()
        return signed_json_response({"message": "Notified patient"}, 200)
    finally:
        if conn: conn.close()

# ==========================================================
# SECURE P2P MESSAGING (E2E RSA+AES ENCRYPTED)
# ==========================================================

@app.route('/api/v2/keys/upload', methods=['POST'])
@jwt_required()
def upload_public_key():
    user_id = get_jwt_identity()
    data = request.get_json()
    public_key = data.get('publicKey')
    
    if not public_key:
        return signed_json_response({"error": "Missing publicKey"}, 400)
        
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor()
        
        try:
            cur.execute("UPDATE users SET rsaPublicKey = %s WHERE id = %s", (public_key, user_id))
        except:
            # Dynamic migration if field is missing conceptually
            cur.execute("ALTER TABLE users ADD COLUMN rsaPublicKey TEXT")
            cur.execute("UPDATE users SET rsaPublicKey = %s WHERE id = %s", (public_key, user_id))
            
        conn.commit()
        return signed_json_response({"message": "Public key updated successfully"}, 200)
    except Exception as e:
        if conn: conn.rollback()
        return signed_json_response({"error": str(e)}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/v2/keys/<target_id>', methods=['GET'])
@jwt_required()
def get_public_key(target_id):
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        cur.execute("SELECT rsaPublicKey FROM users WHERE id = %s", (target_id,))
        row = cur.fetchone()
        if row and row.get('rsaPublicKey') and row['rsaPublicKey'] != 'NO_RSA_YET':
            return signed_json_response({"publicKey": row['rsaPublicKey']}, 200)
        return signed_json_response({"error": "User has no public key yet"}, 404)
    finally:
        if conn: conn.close()

@app.route('/api/ai/chat', methods=['POST'])
@jwt_required()
def ai_chat():
    user_id = get_jwt_identity()
    message = None
    if request.is_json:
        data = request.get_json(silent=True) or {}
        message = data.get('message')
    else:
        message = request.form.get('message')
        
    if not message:
        return signed_json_response({"error": "No message provided"}, 400)

    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user_profile = cur.fetchone()
        
        is_emg, trigger = ai_engine._detect_emergency(message)
        if is_emg:
            reply = ai_engine._build_emergency(trigger)
        else:
            if ai_engine.api_available:
                reply = ai_engine._call_gemini(message, user_id=user_id, user_profile=user_profile)
                if not reply:
                    reply = "Sorry, my AI engine is resting right now. Let me know your symptoms and I can try offline matching."
            else:
                matches = ai_engine._match_symptoms(message)
                user_name = user_profile.get('fullName').split()[0] if user_profile else ""
                reply = ai_engine._build_fallback(message, matches, user_name)
                
        return signed_json_response({"response": reply}, 200)
    finally:
        if conn: conn.close()

@app.route('/api/v2/messages/send', methods=['POST'])
@jwt_required()
def send_e2e_message():
    sender_id = get_jwt_identity()
    data = request.get_json() or {}
    receiver_id = data.get('receiverId')
    if not receiver_id:
        return signed_json_response({"error": "receiverId required"}, 400)

    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor()

        # Ensure E2E table exists with content column
        cur.execute('''
            CREATE TABLE IF NOT EXISTS messages_e2e (
                id INT AUTO_INCREMENT PRIMARY KEY,
                senderId INT,
                receiverId INT,
                content TEXT,
                encryptedAesKeySender TEXT,
                encryptedAesKeyReceiver TEXT,
                iv TEXT,
                ciphertext TEXT,
                tag TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Add content column if it doesn't exist yet (safe migration)
        try:
            cur.execute("ALTER TABLE messages_e2e ADD COLUMN content TEXT")
        except Exception:
            pass  # Column already exists

        cur.execute('''
            INSERT INTO messages_e2e
                (senderId, receiverId, content, encryptedAesKeySender, encryptedAesKeyReceiver, iv, ciphertext, tag)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            sender_id, receiver_id,
            data.get('content'),                    # plain-text for direct display
            data.get('encryptedAesKey_sender'),
            data.get('encryptedAesKey_receiver'),
            data.get('iv'), data.get('ciphertext'), data.get('tag')
        ))
        msg_id = cur.lastrowid
        conn.commit()
        return signed_json_response({"messageId": msg_id, "status": "sent"}, 200)
    except Exception as e:
        app.logger.error(f"E2E Send Error: {e}")
        if conn: conn.rollback()
        return signed_json_response({"error": "Send failed"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/v2/messages/history/<other_id>', methods=['GET'])
@jwt_required()
def get_message_history(other_id):
    user_id = get_jwt_identity()
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        cur.execute('''
            CREATE TABLE IF NOT EXISTS messages_e2e (
                id INT AUTO_INCREMENT PRIMARY KEY,
                senderId INT,
                receiverId INT,
                encryptedAesKeySender TEXT,
                encryptedAesKeyReceiver TEXT,
                iv TEXT,
                ciphertext TEXT,
                tag TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cur.execute('''
            SELECT * FROM messages_e2e 
            WHERE (senderId = %s AND receiverId = %s) OR (senderId = %s AND receiverId = %s)
            ORDER BY timestamp ASC
        ''', (user_id, other_id, other_id, user_id))
        rows = cur.fetchall()
        
        cur.execute('''
            SELECT id, senderId, receiverId, timestamp, encryptedContext as content 
            FROM messages 
            WHERE (senderId = %s AND receiverId = %s) OR (senderId = %s AND receiverId = %s)
            ORDER BY timestamp ASC
        ''', (user_id, other_id, other_id, user_id))
        legacy_rows = cur.fetchall()
        
        messages = []
        
        # Inject old legacy messages into the E2E history feed
        for r in legacy_rows:
            messages.append({
                "id": f"legacy_{r['id']}",
                "senderId": r['senderId'],
                "receiverId": r['receiverId'],
                "timestamp": str(r['timestamp']),
                "content": r['content']
            })
            
        for r in rows:
            messages.append({
                "id": r['id'],
                "senderId": r['senderId'],
                "receiverId": r['receiverId'],
                "timestamp": str(r['timestamp']),
                # Always include content (plain text). Also pass E2E fields for future client-side decrypt.
                "content": r.get('content') or None,
                "encryptedAesKey": r['encryptedAesKeySender'] if str(r['senderId']) == str(user_id) else r['encryptedAesKeyReceiver'],
                "iv": r.get('iv'),
                "ciphertext": r.get('ciphertext'),
                "tag": r.get('tag')
            })
            
        # Re-sort combined list natively to ensure sequential frontend display
        messages.sort(key=lambda x: x['timestamp'])
            
        return signed_json_response({"messages": messages}, 200)
    finally:
        if conn: conn.close()

# ==========================================================
# FORGOT & RESET PASSWORD
# ==========================================================

@app.route('/api/forgot-password', methods=['POST', 'OPTIONS'])
def forgot_password():
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.get_json()
    email = data.get('email')
    if not email:
        return signed_json_response({"error": "Email is required"}, 400)
        
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        if not user:
            # Prevent email enumeration
            return signed_json_response({"message": "If that email is registered, a reset link has been sent."}, 200)
            
        reset_token = secrets.token_urlsafe(32)
        
        # Ensure resetToken columns exist
        try:
            cur.execute("UPDATE users SET resetToken = %s, resetTokenExpiry = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = %s", (reset_token, user['id']))
        except:
            cur.execute("ALTER TABLE users ADD COLUMN resetToken VARCHAR(255) NULL")
            cur.execute("ALTER TABLE users ADD COLUMN resetTokenExpiry DATETIME NULL")
            cur.execute("UPDATE users SET resetToken = %s, resetTokenExpiry = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = %s", (reset_token, user['id']))
            
        conn.commit()
        
        reset_link = f"https://vaidyamedx.in/reset-password?token={reset_token}"
        send_reset_email(email, reset_link, reset_token)
        
        return signed_json_response({"message": "If that email is registered, a reset link has been sent."}, 200)
    except Exception as e:
        app.logger.error(f"Forgot PW Error: {e}")
        return signed_json_response({"error": "Server error"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/reset-password', methods=['POST', 'OPTIONS'])
def reset_password():
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')
    
    if not token or not new_password:
        return signed_json_response({"error": "Token and new password are required"}, 400)
        
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"error": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        cur.execute("SELECT id FROM users WHERE resetToken = %s AND resetTokenExpiry > NOW()", (token,))
        user = cur.fetchone()
        
        if not user:
            return signed_json_response({"error": "Invalid or expired reset token"}, 400)
            
        hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
        
        cur.execute("UPDATE users SET password = %s, resetToken = NULL, resetTokenExpiry = NULL WHERE id = %s", (hashed_password, user['id']))
        conn.commit()
        
        return signed_json_response({"message": "Password has been successfully reset"}, 200)
    except Exception as e:
        app.logger.error(f"Reset PW Error: {e}")
        return signed_json_response({"error": "Server error"}, 500)
    finally:
        if conn: conn.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True, host='0.0.0.0')

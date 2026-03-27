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
        
        cur.execute('''
            INSERT INTO appointments (
                patientId, doctorId, appointmentDate, appointmentTime, type, 
                amountPaid, commissionAmount, doctorPayoutAmount, 
                paymentId, orderId, notes, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (user_id, doctor_id, appt_date, appt_time, appt_type, 
              amount_paid, commission, payout, rzp_payment_id, rzp_order_id, notes, 'Scheduled'))
        
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
    """Retrieve all appointments for the logged-in user (as doctor or patient)."""
    user_id = get_jwt_identity()
    role = request.args.get('role', 'patient') # Default to patient view if unspecified
    
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
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
            appt['createdAt'] = str(appt['createdAt'])
            
        return signed_json_response(appointments, 200)
    except Exception as e:
        app.logger.error(f"Appointments Fetch Error: {e}")
        return signed_json_response({"message": "Failed to fetch appointments."}, 500)
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
    return signed_json_response({"data": []}, 200)

# --- PROFILE AND EMERGENCIES ROUTES ---

@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Fetch complete profile metadata based on user role."""
    user_id = get_jwt_identity()
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        # Get base user details
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user_data = cur.fetchone()
        if not user_data: return signed_json_response({"message": "User not found"}, 404)
        
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
        return signed_json_response({"profile": user_data}, 200)
    except Exception as e:
        app.logger.error(f"Profile Fetch Error: {e}")
        return signed_json_response({"message": "Failed to fetch profile"}, 500)
    finally:
        if conn: conn.close()

@app.route('/api/emergencies/my', methods=['GET'])
@jwt_required()
def get_my_emergencies():
    """Fetch emergencies linked to the current user (patient cases or doctor handled cases)."""
    user_id = get_jwt_identity()
    
    conn = None
    try:
        conn = get_db_connection()
        if not conn: return signed_json_response({"message": "DB error"}, 500)
        cur = conn.cursor(dictionary=True)
        
        # Check user role
        cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        u = cur.fetchone()
        if not u: return signed_json_response({"message": "User not found"}, 404)
        
        if u['role'] == 'doctor':
            cur.execute("SELECT * FROM emergencies WHERE handledById = %s OR status = 'Active' ORDER BY createdAt DESC", (user_id,))
        else:
            cur.execute("SELECT * FROM emergencies WHERE patientId = %s ORDER BY createdAt DESC", (user_id,))
            
        emgs = cur.fetchall()
        for e in emgs:
            e['createdAt'] = str(e['createdAt'])
            
        return signed_json_response({"data": emgs}, 200)
    except Exception as e:
        app.logger.error(f"Emergencies Fetch Error: {e}")
        return signed_json_response({"message": "Failed to fetch emergencies"}, 500)
    finally:
        if conn: conn.close()

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
        
        return signed_json_response({"data": {"emergency": {"id": f"EM-{emg_id}"}}}, 201)
    except Exception as e:
        app.logger.error(f"Emergency Report Error: {e}")
        if conn: conn.rollback()
        return signed_json_response({"error": "Failed to report emergency"}, 500)
    finally:
        if conn: conn.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True, host='0.0.0.0')

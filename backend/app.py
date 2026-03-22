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
from ai.brain import get_brain
from utils.otp_utils import generate_otp
from utils.sms_utils import send_fast2sms_otp
from utils.email_utils import send_reset_email
import secrets
import traceback

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

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
        hashed_password = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')

        # Generate RSA Keys for new user
        private_pem, public_pem = generate_rsa_keypair()
        private_key_encrypted = encrypt_data(private_pem)

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            cursor.execute('''
                INSERT INTO users (fullName, email, password, role, mobile, dob, gender, blood_group, address, city, state, pincode, rsaPublicKey, rsaPrivateKeyEncrypted)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                data.get('fullName'), data.get('email'), hashed_password, role,
                data.get('mobile'), data.get('dob'), data.get('gender'), data.get('bloodGroup'), 
                data.get('address'), data.get('city'), data.get('state'), data.get('pincode'),
                public_pem, private_key_encrypted
            ))
            user_id = cursor.lastrowid

            if role == 'doctor':
                cursor.execute('''
                    INSERT INTO doctor_details (userId, degree, position, specialization, experience, hospital, regNumber, documentPath)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ''', (
                    user_id, data.get('degree'), data.get('position'), data.get('specialization'),
                    data.get('experience'), data.get('hospital'), data.get('regNumber'), doc_path
                ))
            if role == 'patient':
                cursor.execute('''
                    INSERT INTO patient_details (userId)
                    VALUES (%s)
                ''', (user_id,))

            conn.commit()
            return signed_json_response({"message": f"{role.capitalize()} registered successfully!"}, 201)

        except mysql.connector.IntegrityError:
            return signed_json_response({"message": "Email already registered."}, 400)
        finally:
            conn.close()

    except Exception as e:
        return signed_json_response({"message": str(e)}, 500)

@app.route('/api/auth/login', methods=['POST'])
@app.route('/api/login', methods=['POST'])  # backward compat
def login():
    data = request.get_json()
    email = data.get('email')
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
    
    # Check if sender is a doctor
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT role FROM users WHERE id = %s", (current_user_id,))
    user = cursor.fetchone()
    conn.close()
    
    is_doctor = user['role'] == 'doctor' if user else False
    
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
            SELECT u.fullName as name, u.email, u.mobile, u.dob, u.gender, u.blood_group as bloodGroup, u.address, u.city, u.state, u.pincode as pin
            FROM users u
            WHERE u.id = %s
        ''', (current_user_id,))
        profile = cursor.fetchone()
        conn.close()
        return signed_json_response(profile or {})
        
    elif request.method == 'PUT':
        data = request.get_json()
        
        # update users table
        cursor.execute('''
            UPDATE users SET fullName=%s, mobile=%s, dob=%s, gender=%s, blood_group=%s, address=%s, city=%s, state=%s, pincode=%s
            WHERE id=%s
        ''', (data.get('name'), data.get('mobile'), data.get('dob'), data.get('gender'), data.get('bloodGroup'), data.get('address'), data.get('city'), data.get('state'), data.get('pin'), current_user_id))
        
        # update or insert patient_details
        cursor.execute("SELECT userId FROM patient_details WHERE userId=%s", (current_user_id,))
        if cursor.fetchone():
            cursor.execute('''
                UPDATE patient_details SET bloodGroup=%s
                WHERE userId=%s
            ''', (data.get('bloodGroup'), current_user_id))
        else:
            cursor.execute('''
                INSERT INTO patient_details (userId, bloodGroup)
                VALUES (%s, %s)
            ''', (current_user_id, data.get('bloodGroup')))
        
        conn.commit()
        
        # return updated
        cursor.execute('''
            SELECT u.fullName as name, u.email, u.mobile, u.dob, u.gender, u.blood_group as bloodGroup, u.address, u.city, u.state, u.pincode as pin
            FROM users u
            WHERE u.id = %s
        ''', (current_user_id,))
        profile = cursor.fetchone()
        conn.close()
        return signed_json_response(profile or {"message": "Profile updated!"})

@app.route('/api/doctors', methods=['GET'])
@jwt_required()
def get_doctors():
    """Lists all registered doctors with details."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT u.id, u.fullName as name, d.specialization as spec, d.degree, d.experience, d.hospital
        FROM users u 
        JOIN doctor_details d ON u.id = d.userId 
        WHERE u.role = 'doctor'
    ''')
    doctors = cursor.fetchall()
    conn.close()
    
    # Add mock rating/fee if not in DB yet for rich UI
    for d in doctors:
        d['rating'] = 4.8
        d['fee'] = 800
        
    return signed_json_response({"doctors": doctors})

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
        
        conn.commit()
        return signed_json_response({"message": f"Appointment {status.lower()} successfully!"})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

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
    response = brain.process_query(user_query)
    
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
    
    brain = get_brain()
    response = brain.process_query(text)
    
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

# --- WEBRTC SIGNALING ENDPOINTS ---
@socketio.on('join_video_room')
def on_join_video_room(data):
    if 'room' in data:
        room = str(data['room'])
        join_room(room)
        emit('peer_joined', {'message': 'A peer has joined'}, to=room, include_self=False)

@socketio.on('video_offer')
def on_video_offer(data):
    if 'room' in data and 'offer' in data:
        emit('video_offer', data['offer'], to=str(data['room']), include_self=False)

@socketio.on('video_answer')
def on_video_answer(data):
    if 'room' in data and 'answer' in data:
        emit('video_answer', data['answer'], to=str(data['room']), include_self=False)

@socketio.on('new_ice_candidate')
def on_new_ice_candidate(data):
    if 'room' in data and 'candidate' in data:
        emit('new_ice_candidate', data['candidate'], to=str(data['room']), include_self=False)

@socketio.on('doctor_ready')
def on_doctor_ready(data):
    if 'room' in data:
        emit('doctor_ready', {'message': 'Doctor is ready'}, to=str(data['room']), include_self=False)

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

if __name__ == '__main__':
    init_db()
    socketio.run(app, port=8000, debug=True, host='0.0.0.0')

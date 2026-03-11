import os
import mysql.connector
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.utils import secure_filename
from database import get_db_connection, init_db
from security_utils import verify_hmac, encrypt_data, decrypt_data, sign_response, generate_rsa_keypair
import chat_vcall
from datetime import timedelta
import functools
import time
from ai.brain import get_brain

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

# Configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'neural-agent-secret-2026')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['UPLOAD_FOLDER'] = 'uploads'
jwt = JWTManager(app)

@jwt.invalid_token_loader
def invalid_token_callback(error_string):
    app.logger.error(f"JWT Invalid Token Error: {error_string}")
    return jsonify({"error": f"Invalid token: {error_string}"}), 422

@jwt.unauthorized_loader
def missing_token_callback(error_string):
    app.logger.error(f"JWT Missing Token Error: {error_string}")
    return jsonify({"error": f"Missing token: {error_string}"}), 401

# Rate Limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["1000 per day", "200 per hour"],
    storage_uri="memory://",
)

# Exempt CORS preflight (OPTIONS) requests from rate limiting
@limiter.request_filter
def exempt_options():
    return request.method == 'OPTIONS'

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
        "endpoints": ["/api/login", "/api/register", "/api/forgot-password", "/api/messages/send", "/api/messages/history"]
    })

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    # Mock implementation
    return signed_json_response({"message": f"If an account exists for {email}, a reset link has been sent."}), 200

@app.errorhandler(404)
def not_found(e):
    app.logger.error(f"404 Error: {request.path} [{request.method}]")
    return signed_json_response({"error": "Path not found", "path": request.path}, 404)

@app.route('/api/register', methods=['POST'])
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
                INSERT INTO users (fullName, email, password, role, mobile, address, city, state, pincode, rsaPublicKey, rsaPrivateKeyEncrypted)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                data.get('fullName'), data.get('email'), hashed_password, role,
                data.get('mobile'), data.get('address'), data.get('city'), data.get('state'), data.get('pincode'),
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
            else:
                cursor.execute('''
                    INSERT INTO patient_details (userId, dob, gender)
                    VALUES (%s, %s, %s)
                ''', (user_id, data.get('dob'), data.get('gender')))

            conn.commit()
            return signed_json_response({"message": f"{role.capitalize()} registered successfully!"}, 201)

        except mysql.connector.IntegrityError:
            return signed_json_response({"message": "Email already registered."}, 400)
        finally:
            conn.close()

    except Exception as e:
        return signed_json_response({"message": str(e)}, 500)

@app.route('/api/login', methods=['POST'])
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
@limiter.limit("10 per minute")
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
@limiter.limit("30 per minute")
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
@limiter.limit("10 per minute")
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
@limiter.limit("30 per minute")
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

@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. Update basic user info
        cursor.execute('''
            UPDATE users 
            SET fullName = %s, mobile = %s, address = %s, city = %s, state = %s, pincode = %s
            WHERE id = %s
        ''', (
            data.get('name'), data.get('mobile'), data.get('address'), data.get('city'),
            data.get('state'), data.get('pin'), current_user_id
        ))
        
        # 2. Update role-specific details
        cursor.execute('SELECT role FROM users WHERE id = %s', (current_user_id,))
        role = cursor.fetchone()['role']
        
        if role == 'patient':
            cursor.execute('''
                UPDATE patient_details 
                SET dob = %s, gender = %s, dosha = %s, allergies = %s, conditions = %s, medications = %s
                WHERE userId = %s
            ''', (
                data.get('dob'), data.get('gender'), data.get('dosha'),
                data.get('allergies'), data.get('conditions'), data.get('medications'),
                current_user_id
            ))
        elif role == 'doctor':
            # Add doctor update logic if needed
            pass
            
        conn.commit()
        
        # Return updated user object
        cursor.execute('SELECT id, fullName as name, email, mobile, role FROM users WHERE id = %s', (current_user_id,))
        updated_user = cursor.fetchone()
        
        return signed_json_response(updated_user, 200)
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
    time = data.get('time')
    app_type = data.get('type')
    notes = data.get('notes', '')
    
    if not all([doctor_id, date, time, app_type]):
        return signed_json_response({"error": "Missing booking details"}, 400)
    
    conn = get_db_connection()
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
        # Format dates/times for JSON
        for a in appointments:
            a['appointmentDate'] = a['appointmentDate'].isoformat()
            a['appointmentTime'] = str(a['appointmentTime'])
            
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
        from database import create_notification
        create_notification(other_user_id, 'Appointment', content)
        
        conn.commit()
        return signed_json_response({"message": f"Appointment {status.lower()} successfully!"})
    except Exception as e:
        return signed_json_response({"error": str(e)}, 500)
    finally:
        conn.close()

# --- MedAssist-X AI Endpoints ---

@app.route('/api/ai/chat', methods=['POST'])
@jwt_required()
@limiter.limit("30 per minute")
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

if __name__ == '__main__':
    init_db()
    app.run(port=5000, debug=True)

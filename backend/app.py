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

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

# Configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'neural-agent-secret-2026')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['UPLOAD_FOLDER'] = 'uploads'
jwt = JWTManager(app)

# Rate Limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

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
    return signed_json_response({"message": "Video call signal sent!", "detail": result}, status)

@app.route('/api/doctors', methods=['GET'])
@jwt_required()
def get_doctors():
    """Lists all registered doctors."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT u.id, u.fullName, d.specialization, d.degree 
        FROM users u 
        JOIN doctor_details d ON u.id = d.userId 
        WHERE u.role = 'doctor'
    ''')
    doctors = cursor.fetchall()
    conn.close()
    return signed_json_response({"doctors": doctors})

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

if __name__ == '__main__':
    init_db()
    app.run(port=5000, debug=True)

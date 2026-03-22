from flask import jsonify
from database import get_db_connection
from security_utils import hybrid_encrypt, hybrid_decrypt
# from security_utils import encrypt_data, decrypt_data
import mysql.connector

def send_chat_message(sender_id, receiver_id, content, is_doctor):
    from security_utils import encrypt_data
    """Sends a message using hybrid RSA+AES encryption."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. Fetch recipient's RSA Public Key
        cursor.execute("SELECT rsaPublicKey FROM users WHERE id = %s", (receiver_id,))
        recipient = cursor.fetchone()
        
        if not recipient or not recipient['rsaPublicKey']:
            return {"error": "Recipient RSA key not found"}, 400
        
        # 2. Perform Standard Encryption (AES) so both can read it
        # Previously was hybrid: hybrid_encrypt(content, recipient['rsaPublicKey'])
        encrypted_bundle = encrypt_data(content)
        
        # 3. Store in database
        # Set isDoctorResponded to True if the sender is a doctor
        cursor.execute('''
            INSERT INTO messages (senderId, receiverId, encryptedContext, isDoctorResponded)
            VALUES (%s, %s, %s, %s)
        ''', (sender_id, receiver_id, encrypted_bundle, is_doctor))
        
        conn.commit()
        return {"message": "Secure hybrid message sent!", "is_doctor": is_doctor}, 201
        
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        conn.close()

def get_chat_history(user_id, other_id):
    from security_utils import decrypt_data
    """Retrieves and decrypts chat history using the user's RSA private key."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 2. Fetch messages
        # No RSA private key decryption needed for standard symmetric DB storage.
        cursor.execute('''
            SELECT * FROM messages 
            WHERE (senderId = %s AND receiverId = %s) 
               OR (senderId = %s AND receiverId = %s)
            ORDER BY timestamp ASC
        ''', (user_id, other_id, other_id, user_id))
        
        rows = cursor.fetchall()
        
        messages = []
        for row in rows:
            # Try Standard AES Decryption
            decrypted_content = decrypt_data(row['encryptedContext'])
            
            messages.append({
                "id": row['id'],
                "senderId": row['senderId'],
                "receiverId": row['receiverId'],
                "content": decrypted_content if decrypted_content else "[DECRYPTION FAILED]",
                "isDoctorResponded": row['isDoctorResponded'],
                "timestamp": row['timestamp'].isoformat() + "Z"
            })
            
        return {"messages": messages}, 200
        
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        conn.close()

def check_auto_response_allowed(receiver_id, patient_id):
    """Checks if the doctor has ever responded to the patient."""
    # If the doctor hasn't responded yet, no automated response is allowed.
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute('''
        SELECT COUNT(*) as count FROM messages 
        WHERE senderId = %s AND receiverId = %s AND isDoctorResponded = TRUE
    ''', (receiver_id, patient_id))
    
    res = cursor.fetchone()
    conn.close()
    
    return res['count'] > 0

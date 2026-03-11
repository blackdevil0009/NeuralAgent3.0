import mysql.connector
from flask_bcrypt import Bcrypt
from flask import Flask
from database import get_db_connection

app = Flask(__name__)
bcrypt = Bcrypt(app)

def verify_hashed_storage():
    email = "test@example.com"
    password = "testpassword123"
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # 1. Clear existing test user
    cursor.execute("DELETE FROM users WHERE email = %s", (email,))
    
    # 2. Insert test user with hashed password
    cursor.execute('''
        INSERT INTO users (fullName, email, password, role)
        VALUES (%s, %s, %s, %s)
    ''', ("Test User", email, hashed_password, "patient"))
    conn.commit()
    
    # 3. Fetch user and verify hashed format
    cursor.execute("SELECT password FROM users WHERE email = %s", (email,))
    row = cursor.fetchone()
    stored_password = row['password']
    
    print(f"Stored Hashed Password: {stored_password}")
    
    # 4. Verify password with bcrypt
    is_valid = bcrypt.check_password_hash(stored_password, password)
    print(f"Bcrypt verification success: {is_valid}")
    
    # Check if it looks like a hash (should start with $2b$)
    if stored_password.startswith('$2b$'):
         print("Password format looks correctly hashed ($2b$ prefix).")
    else:
         print("WARNING: Password format might not be correct.")

    conn.close()

if __name__ == "__main__":
    verify_hashed_storage()

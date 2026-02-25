from database import get_db_connection
import mysql.connector

def migrate():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("Migrating database...")
    
    # 1. Add columns to users table
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN rsaPublicKey TEXT")
        print("Added rsaPublicKey to users.")
    except mysql.connector.Error as e:
        print(f"rsaPublicKey column might already exist: {e}")

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN rsaPrivateKeyEncrypted TEXT")
        print("Added rsaPrivateKeyEncrypted to users.")
    except mysql.connector.Error as e:
        print(f"rsaPrivateKeyEncrypted column might already exist: {e}")

    # 2. Add column to messages table
    try:
        cursor.execute("ALTER TABLE messages ADD COLUMN isDoctorResponded BOOLEAN DEFAULT FALSE")
        print("Added isDoctorResponded to messages.")
    except mysql.connector.Error as e:
        print(f"isDoctorResponded column might already exist: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()

import mysql.connector
import os
from mysql.connector import Error

DB_CONFIG = {
    'host': 'localhost',
    'user': 'vaidyamedx',
    'password': 'Devil@2007%',
    'database': 'neuralagent_db'
}

def migrate():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        if conn.is_connected():
            cursor = conn.cursor()
            cursor.execute("ALTER TABLE appointments ADD COLUMN reminderSent BOOLEAN DEFAULT FALSE AFTER notes;")
            conn.commit()
            print("Migration successful: Added reminderSent column.")
    except Error as e:
        print(f"Error: {e}")
    finally:
        if conn and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    migrate()

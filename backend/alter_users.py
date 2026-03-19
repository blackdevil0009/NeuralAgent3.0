import mysql.connector
from database import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE users ADD COLUMN dob VARCHAR(20)")
except Exception as e:
    print(e)

try:
    cursor.execute("ALTER TABLE users ADD COLUMN gender VARCHAR(20)")
except Exception as e:
    print(e)

try:
    cursor.execute("ALTER TABLE users ADD COLUMN blood_group VARCHAR(10)")
except Exception as e:
    print(e)

from datetime import datetime
cursor.execute("UPDATE users SET createdAt = CURRENT_TIMESTAMP WHERE createdAt IS NULL")

conn.commit()
print("Added dob, gender, blood_group to users table")

conn.close()

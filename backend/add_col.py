import mysql.connector
from database import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE patient_details ADD COLUMN bloodGroup VARCHAR(10)")
    conn.commit()
    print("Column added.")
except mysql.connector.Error as err:
    print(f"Error: {err}")

conn.close()

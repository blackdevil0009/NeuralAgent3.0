import mysql.connector
from database import get_db_connection

conn = get_db_connection()
cursor = conn.cursor(dictionary=True)

cursor.execute("DESCRIBE users")
schema = cursor.fetchall()
print("USERS SCHEMA:")
for col in schema:
    print(col)

cursor.execute("SELECT id, fullName, email, mobile FROM users ORDER BY id DESC LIMIT 5")
users = cursor.fetchall()
print("\nRECENT USERS:")
for u in users:
    print(u)

conn.close()

from dotenv import load_dotenv
load_dotenv()
import database

conn = database.get_db_connection()
if conn:
    print("Connected.")
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT COUNT(*) FROM messages_e2e")
    print("Count E2E:", cur.fetchone())
    cur.execute("SELECT * FROM messages_e2e LIMIT 5")
    print("E2E msgs:", cur.fetchall())
else:
    print("Failed")

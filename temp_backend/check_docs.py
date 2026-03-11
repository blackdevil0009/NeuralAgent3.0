from database import get_db_connection
conn = get_db_connection()
c = conn.cursor(dictionary=True)
c.execute("SELECT u.fullName, d.specialization FROM users u JOIN doctor_details d ON u.id = d.userId WHERE u.role = 'doctor' ORDER BY u.id DESC LIMIT 10")
rows = c.fetchall()
for r in rows:
    print(f"  {r['fullName']:30s} | {r['specialization']}")
c.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'doctor'")
print(f"\nTotal registered doctors: {c.fetchone()['cnt']}")
conn.close()

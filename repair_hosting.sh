#!/bin/bash
# Re-create systemd service
cat <<EOT > /etc/systemd/system/backend.service
[Unit]
Description=NeuralAgent Backend Service
After=network.target mysql.service

[Service]
User=root
Group=root
WorkingDirectory=/root/backend
Environment="PATH=/root/backend/venv/bin"
Environment="JWT_SECRET_KEY=vaidyamedx-secret-2026"
Environment="FRONTEND_URL=http://localhost:3000"
ExecStart=/root/backend/venv/bin/gunicorn --workers 1 --bind 127.0.0.1:8000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
EOT

# Re-create Nginx config
rm -f /etc/nginx/sites-enabled/default
cat <<EOT > /etc/nginx/sites-available/backend
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOT
ln -sf /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/backend

# Fix permissions and reload
fuser -k 8000/tcp
systemctl daemon-reload
systemctl enable backend
systemctl restart backend
systemctl restart nginx

# Verify Dummy User
cd /root/backend
export PYTHONPATH=$PYTHONPATH:/root/backend
./venv/bin/python3 <<EOP
import bcrypt
from database import get_db_connection
conn = get_db_connection()
cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT id FROM users WHERE email='dummy@example.com'")
user = cursor.fetchone()
if not user:
    password = 'DummyPass123!'
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    cursor.execute("""
        INSERT INTO users (fullName, email, password, role, mobile, address, city, state, pincode)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, ('Dummy User', 'dummy@example.com', hashed, 'patient', '1234567890', '123 Street', 'City', 'State', '123456'))
    user_id = cursor.lastrowid
    cursor.execute("INSERT INTO patient_details (userId, dob, gender) VALUES (%s, %s, %s)", (user_id, '1990-01-01', 'other'))
    conn.commit()
    print('Dummy user created.')
else:
    print('Dummy user already exists.')
conn.close()
EOP

systemctl status backend --no-pager
systemctl status nginx --no-pager

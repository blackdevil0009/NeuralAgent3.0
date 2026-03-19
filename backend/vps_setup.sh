#!/bin/bash
# VaidyaMed-X Backend VPS Setup Script (api.vaidyamedx.in)
set -e
echo "=== VaidyaMed-X Backend VPS Setup (Fresh) ==="

BACKEND_DIR="/opt/backend"
DOMAIN="api.vaidyamedx.in"
EMAIL="blackdevil0009@gmail.com"

# 1. Install system dependencies
echo ">>> Step 1: Installing system packages..."
apt-get update -qq
apt-get install -y python3-venv python3-pip mysql-server nginx certbot python3-certbot-nginx unzip -qq

# 2. Setup Python virtual environment & Extract Backend
echo ">>> Step 2: Extracting backend and setting up venv..."
mkdir -p "$BACKEND_DIR"
if [ -f "/tmp/backend.zip" ]; then
    unzip -o /tmp/backend.zip -d "$BACKEND_DIR"
    echo "Backend unzipped to $BACKEND_DIR"
fi
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "venv created"
else
    echo "venv already exists"
fi

source venv/bin/activate
pip install --upgrade pip -q
pip install flask flask-cors flask-bcrypt flask-jwt-extended python-dotenv werkzeug mysql-connector-python flask-limiter cryptography pydantic requests gunicorn -q
echo "Packages installed OK"

# 3. Configure MySQL
echo ">>> Step 3: Configuring MySQL..."
systemctl start mysql 2>/dev/null || true
sleep 2
mysql -u root << 'MYSQL_EOF' 2>/dev/null || true
CREATE DATABASE IF NOT EXISTS neuralagent_db;
MYSQL_EOF
echo "MySQL configured"

# 4. Create .env file
echo ">>> Step 4: Creating .env file..."
cat > "$BACKEND_DIR/.env" << ENV_EOF
JWT_SECRET_KEY=neural_agent_python_secret_2026
UPLOAD_FOLDER=uploads
FLASK_APP=app.py
FLASK_ENV=production
GEMINI_API_KEY=AIzaSyBGScuXAZxk5eGvrsBGAw82usi9xT0e89U
FRONTEND_URL=https://vaidyamedx.in
ENV_EOF
mkdir -p "$BACKEND_DIR/uploads"

# 5. Create systemd service
echo ">>> Step 5: Creating systemd service..."
cat > /etc/systemd/system/vaidyamed.service << SERVICE_EOF
[Unit]
Description=VaidyaMed-X Backend API Server
After=network.target mysql.service

[Service]
User=root
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$BACKEND_DIR/venv/bin"
ExecStart=$BACKEND_DIR/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 --timeout 120 app:app
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable vaidyamed
systemctl start vaidyamed

# 6. Configure Nginx with SSL
echo ">>> Step 6: Configuring Nginx & SSL..."
cat > /etc/nginx/sites-available/vaidyamed << NGINX_EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/vaidyamed /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Obtain SSL certificate
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL || echo "Certbot failed, will retry later"

systemctl restart nginx

echo "=== VaidyaMed-X Backend Setup COMPLETE! ==="
echo "API Domain: https://$DOMAIN"

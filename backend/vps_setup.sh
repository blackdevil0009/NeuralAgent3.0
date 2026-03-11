#!/bin/bash
# VaidyaMed-X Backend Setup Script for VPS (148.230.66.181)
# Run this in Hostinger's browser terminal

set -e
echo "=== VaidyaMed-X Backend VPS Setup ==="

BACKEND_DIR="/opt/backend"
LOG_FILE="/var/log/vaidyamed.log"

# ─────────────────────────────────────────────
# STEP 1: Kill any old process on port 5000
# ─────────────────────────────────────────────
echo ">>> Step 1: Stopping old instances..."
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "gunicorn.*app:app" 2>/dev/null || true
sleep 1

# ─────────────────────────────────────────────
# STEP 2: Detect backend location
# ─────────────────────────────────────────────
echo ">>> Step 2: Checking backend files..."
if [ -d "/opt/test_backend" ] && [ ! -d "/opt/backend" ]; then
    echo "Found backend at /opt/test_backend → moving to /opt/backend"
    mv /opt/test_backend /opt/backend
elif [ -d "/opt/backend" ]; then
    echo "Backend already at /opt/backend — OK"
else
    echo "ERROR: No backend found at /opt/test_backend or /opt/backend!"
    echo "Please upload the backend zip first."
    exit 1
fi

ls "$BACKEND_DIR"

# ─────────────────────────────────────────────
# STEP 3: Install system dependencies
# ─────────────────────────────────────────────
echo ">>> Step 3: Installing system packages..."
apt-get update -qq
apt-get install -y python3-venv python3-pip mysql-server nginx -qq

# ─────────────────────────────────────────────
# STEP 4: Setup Python virtual environment
# ─────────────────────────────────────────────
echo ">>> Step 4: Setting up Python venv..."
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

# ─────────────────────────────────────────────
# STEP 5: Configure MySQL
# ─────────────────────────────────────────────
echo ">>> Step 5: Configuring MySQL..."
systemctl start mysql 2>/dev/null || service mysql start 2>/dev/null || true
sleep 2

# Set root password and create database
mysql -u root --connect-expired-password << 'MYSQL_EOF' 2>/dev/null || \
mysql -u root -p2007 << 'MYSQL_EOF' 2>/dev/null || echo "MySQL already configured"
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '2007';
FLUSH PRIVILEGES;
CREATE DATABASE IF NOT EXISTS neuralagent_db;
MYSQL_EOF

echo "MySQL configured"

# ─────────────────────────────────────────────
# STEP 6: Create .env file on VPS
# ─────────────────────────────────────────────
echo ">>> Step 6: Creating .env file..."
cat > "$BACKEND_DIR/.env" << 'ENV_EOF'
JWT_SECRET_KEY=neural_agent_python_secret_2026
UPLOAD_FOLDER=uploads
FLASK_APP=app.py
FLASK_ENV=production
GEMINI_API_KEY=AIzaSyBGScuXAZxk5eGvrsBGAw82usi9xT0e89U
ENV_EOF

mkdir -p "$BACKEND_DIR/uploads"
echo ".env created"

# ─────────────────────────────────────────────
# STEP 7: Initialize database schema
# ─────────────────────────────────────────────
echo ">>> Step 7: Initializing database..."
cd "$BACKEND_DIR"
source venv/bin/activate
python3 -c "from database import init_db; init_db(); print('DB initialized OK')"

# ─────────────────────────────────────────────
# STEP 8: Create systemd service
# ─────────────────────────────────────────────
echo ">>> Step 8: Creating systemd service..."
cat > /etc/systemd/system/vaidyamed.service << 'SERVICE_EOF'
[Unit]
Description=VaidyaMed-X Backend API Server
After=network.target mysql.service

[Service]
User=root
WorkingDirectory=/opt/backend
Environment="PATH=/opt/backend/venv/bin"
ExecStart=/opt/backend/venv/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 --timeout 120 app:app
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
sleep 3
systemctl status vaidyamed --no-pager

# ─────────────────────────────────────────────
# STEP 9: Configure Nginx as reverse proxy
# ─────────────────────────────────────────────
echo ">>> Step 9: Configuring Nginx..."
cat > /etc/nginx/sites-available/vaidyamed << 'NGINX_EOF'
server {
    listen 80;
    server_name 148.230.66.181 vaidyamedx.in www.vaidyamedx.in;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
    }
}
NGINX_EOF

# Enable the site
ln -sf /etc/nginx/sites-available/vaidyamed /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx && echo "Nginx OK"

# ─────────────────────────────────────────────
# STEP 10: Open firewall ports
# ─────────────────────────────────────────────
echo ">>> Step 10: Opening firewall ports..."
ufw allow 22/tcp comment 'SSH' 2>/dev/null || true
ufw allow 80/tcp comment 'HTTP' 2>/dev/null || true
ufw allow 443/tcp comment 'HTTPS' 2>/dev/null || true
ufw allow 5000/tcp comment 'Flask API' 2>/dev/null || true
ufw --force enable 2>/dev/null || true
echo "Firewall configured"

# ─────────────────────────────────────────────
# STEP 11: Health check
# ─────────────────────────────────────────────
echo ">>> Step 11: Running health check..."
sleep 2
curl -s http://localhost:5000/ || echo "WARNING: Local health check failed"
curl -s http://localhost:80/ || echo "WARNING: Nginx health check failed"

echo ""
echo "============================================"
echo "✅ VaidyaMed-X Backend Setup COMPLETE!"
echo "============================================"
echo "Backend: http://148.230.66.181:5000"
echo "Nginx:   http://148.230.66.181"
echo ""
echo "Check service status: systemctl status vaidyamed"
echo "View logs:            journalctl -u vaidyamed -f"
echo "============================================"

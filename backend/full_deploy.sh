#!/bin/bash
# ============================================================
# VaidyaMed-X Full Deployment Script (ONE-SHOT)
# Run as root on your VPS
# ============================================================
set -e
BACKEND_DIR="/opt/backend"
DOMAIN="api.vaidyamedx.in"
EMAIL="blackdevil0009@gmail.com"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   VaidyaMed-X Full Deployment Starting...       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── STEP 1: CLEANUP ──────────────────────────────────────
echo "[1/9] Cleaning up old processes and configs..."
systemctl stop vaidyamed.service 2>/dev/null || true
systemctl stop vaidyamedx.service 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true
systemctl disable vaidyamed.service 2>/dev/null || true
pkill -9 -f gunicorn 2>/dev/null || true
pkill -9 -f "python.*app.py" 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true
fuser -k 443/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
rm -f /etc/nginx/sites-available/vaidyamed
rm -f /etc/nginx/sites-enabled/vaidyamed
rm -f /etc/systemd/system/vaidyamed.service
systemctl daemon-reload
echo "✅ Cleanup done"

# ── STEP 2: INSTALL PACKAGES ─────────────────────────────
echo "[2/9] Installing system packages..."
apt-get update -qq
apt-get install -y python3-venv python3-pip mysql-server nginx certbot python3-certbot-nginx unzip ufw -qq
echo "✅ Packages installed"

# ── STEP 3: SETUP BACKEND FILES ──────────────────────────
echo "[3/9] Setting up backend directory..."
mkdir -p "$BACKEND_DIR"
if [ -f "/tmp/backend.zip" ]; then
    rm -rf "$BACKEND_DIR"/*.py "$BACKEND_DIR"/*.txt "$BACKEND_DIR"/*.sh "$BACKEND_DIR"/*.json
    unzip -o /tmp/backend.zip -d "$BACKEND_DIR" -x "*/venv/*" "*/uploads/*" "*.pyc"
    echo "✅ Backend files extracted"
else
    echo "⚠️  No /tmp/backend.zip found. Using existing files in $BACKEND_DIR"
fi

# ── STEP 4: PYTHON VENV & DEPS ───────────────────────────
echo "[4/9] Setting up Python virtualenv and dependencies..."
cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install flask flask-cors flask-bcrypt flask-jwt-extended python-dotenv werkzeug mysql-connector-python flask-limiter cryptography pydantic requests gunicorn flask-socketio gevent gevent-websocket -q
deactivate
echo "✅ Python environment ready"

# ── STEP 5: ENV FILE ─────────────────────────────────────
echo "[5/9] Creating .env file..."
cat > "$BACKEND_DIR/.env" << 'ENV_EOF'
JWT_SECRET_KEY=neural_agent_python_secret_2026
UPLOAD_FOLDER=uploads
FLASK_APP=app.py
FLASK_ENV=production
GEMINI_API_KEY=AIzaSyBGScuXAZxk5eGvrsBGAw82usi9xT0e89U
FRONTEND_URL=https://vaidyamedx.in
ENV_EOF
mkdir -p "$BACKEND_DIR/uploads"
echo "✅ .env file created"

# ── STEP 6: MYSQL ────────────────────────────────────────
echo "[6/9] Configuring MySQL..."
systemctl start mysql 2>/dev/null || service mysql start 2>/dev/null || true
sleep 3
mysql -u root 2>/dev/null << 'SQL' || mysql -u root -p2007 2>/dev/null << 'SQL' || true
CREATE DATABASE IF NOT EXISTS neuralagent_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL
echo "✅ MySQL configured"

# ── STEP 7: SYSTEMD SERVICE ──────────────────────────────
echo "[7/9] Creating systemd service..."
cat > /etc/systemd/system/vaidyamed.service << SEOF
[Unit]
Description=VaidyaMed-X Backend API
After=network.target mysql.service

[Service]
User=root
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$BACKEND_DIR/.env
Environment=PATH=$BACKEND_DIR/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$BACKEND_DIR/venv/bin/gunicorn -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 --threads 100 --bind 127.0.0.1:5000 --timeout 120 --log-level info app:app
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SEOF

systemctl daemon-reload
systemctl enable vaidyamed
systemctl start vaidyamed
sleep 5

if systemctl is-active --quiet vaidyamed; then
    echo "✅ vaidyamed service running"
else
    echo "⚠️  Service failed to start. Logs:"
    journalctl -u vaidyamed -n 30 --no-pager
fi

# ── STEP 8: NGINX + SSL ──────────────────────────────────
echo "[8/9] Configuring Nginx and SSL..."
cat > /etc/nginx/sites-available/vaidyamed << 'NEOF'
server {
    listen 80;
    server_name api.vaidyamedx.in;
    client_max_body_size 50M;

    location / {
        # ── CORS: handle OPTIONS preflight at Nginx level ──────────────
        if ($request_method = OPTIONS) {
            add_header 'Access-Control-Allow-Origin' 'https://vaidyamedx.in' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-HMAC-Signature, X-Timestamp' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 86400 always;
            return 204;
        }

        # ── CORS: always add headers (even on 4xx/5xx responses) ───────
        add_header 'Access-Control-Allow-Origin' 'https://vaidyamedx.in' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-HMAC-Signature, X-Timestamp' always;

        # ── WebSocket + proxy settings ──────────────────────────────────
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
    }
}
NEOF

ln -sf /etc/nginx/sites-available/vaidyamed /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
sleep 2

# Get SSL cert
certbot --nginx -d api.vaidyamedx.in \
    --non-interactive \
    --agree-tos \
    --email blackdevil0009@gmail.com \
    --redirect

systemctl reload nginx
echo "✅ Nginx + SSL configured"

# ── STEP 9: FIREWALL ─────────────────────────────────────
echo "[9/9] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose
echo "✅ Firewall configured"

# ── FINAL HEALTH CHECK ───────────────────────────────────
echo ""
echo "Running health checks..."
sleep 3

LOCAL=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/ 2>/dev/null || echo "FAIL")
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -L http://api.vaidyamedx.in/ 2>/dev/null || echo "FAIL")
HTTPS=$(curl -s -o /dev/null -w "%{http_code}" https://api.vaidyamedx.in/ 2>/dev/null || echo "FAIL")

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║           DEPLOYMENT COMPLETE                   ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║ Local (port 5000): $LOCAL"
echo "║ HTTP  (port 80):   $HTTP"
echo "║ HTTPS (port 443):  $HTTPS"
echo "╠══════════════════════════════════════════════════╣"
echo "║ API URL: https://api.vaidyamedx.in              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Service status:"
systemctl status vaidyamed --no-pager -l | tail -20

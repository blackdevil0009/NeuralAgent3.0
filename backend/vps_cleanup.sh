#!/bin/bash
# VaidyaMed-X VPS Cleanup Script
echo "=== Starting Full VPS Cleanup ==="

# 1. Stop services
echo "Stopping services..."
systemctl stop vaidyamed || true
systemctl stop nginx || true
systemctl disable vaidyamed || true

# 2. Kill processes on ports 80, 443, 5000
echo "Killing processes on ports 80, 443, 5000..."
fuser -k 80/tcp 2>/dev/null || true
fuser -k 443/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
pkill -f "python.*app.py" || true
pkill -f "gunicorn.*app:app" || true

# 3. Remove configurations
echo "Removing configurations..."
rm -f /etc/nginx/sites-available/vaidyamed
rm -f /etc/nginx/sites-enabled/vaidyamed
rm -f /etc/systemd/system/vaidyamed.service
systemctl daemon-reload

# 4. Clean up backend directory (optional but safer for fresh start)
# Note: Keeping the folder but clearing files might be better than rm -rf /opt/backend
# if we want to preserve things like 'uploads' or 'venv' if they are large but user said "fresh".
# I'll clear it except for 'uploads'.
echo "Cleaning up /opt/backend (preserving uploads)..."
if [ -d "/opt/backend" ]; then
    find /opt/backend -maxdepth 1 ! -name 'uploads' ! -name '.' ! -name '..' -exec rm -rf {} +
fi

echo "=== Cleanup Complete ==="

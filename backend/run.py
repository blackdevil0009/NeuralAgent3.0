"""
run.py — VaidyaMed-X Backend Entry Point

Uses gevent as the async worker instead of eventlet.
eventlet is incompatible with Python 3.14+ due to
the removal of _thread.start_joinable_thread.
"""
import importlib.util
import os
import sys
import socket
import subprocess
import atexit
import time

# ── Gevent monkey-patch MUST be first ────────────────────────
from gevent import monkey
monkey.patch_all()

from app import create_app

app = create_app()

# 🏔️ AI Services temporarily disabled
# from app.controllers.ai_v2_controller import get_ayurveda_service

def pre_warm_ai():
    print("🏔️ AI Engine pre-warming is temporarily DISABLED for maintenance.")
    # try:
    #     service = get_ayurveda_service()
    #     service._initialize_index()
    #     print("🚀 AI Engines Ready & Optimized.")
    # except Exception as e:
    #     print(f"⚠️ Pre-warm notice: {e}")

with app.app_context():
    pre_warm_ai()

from gevent.pywsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler


def _is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
            return True
        except OSError:
            return False


if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 'yes')
    port  = int(os.getenv('PORT', 5000))
    host  = os.getenv('HOST', '0.0.0.0')

    print(f"\nVaidyaMed-X Backend starting on http://{host}:{port}")
    print(f"   Async mode  : gevent (Explicit WSGI)")
    print(f"   Debug mode  : {debug}\n")

    if not _is_port_available(host, port):
        print(f"❌ Port {port} is already in use on {host}.")
        print("   Stop the process using it or set PORT to an available port.")
        sys.exit(1)

    http_server = WSGIServer(
        (host, port),
        app,
        handler_class=WebSocketHandler,
    )

    try:
        http_server.serve_forever()
    except OSError as exc:
        print(f"❌ Failed to bind server socket: {exc}")
        sys.exit(1)

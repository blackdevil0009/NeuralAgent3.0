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

# 🏔️ Pre-warm AI Services
from app.controllers.ai_v2_controller import get_rag_service, get_gemini_service

ai_process = None

def start_ayurveda_ai():
    global ai_process
    ai_dir = os.path.join(os.path.dirname(__file__), 'ayurveda_ai')
    if not os.path.exists(ai_dir):
        print(f"⚠️ Ayurveda AI directory not found at {ai_dir}. Skipping...")
        return
    
    print("🧠 Starting Ayurveda AI Engine (TinyLlama/FastAPI)...")
    if importlib.util.find_spec('uvicorn') is None:
        print("⚠️ Uvicorn is not installed in the current Python environment. Skipping Ayurveda AI Engine startup.")
        return

    try:
        # Start uvicorn as a background process
        ai_process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8000", "--host", "127.0.0.1"],
            cwd=ai_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Robust check: Wait for the port to open and the model to load
        max_retries = 30 # 30 * 2 seconds = 60 seconds max
        try:
            import requests as requests_lib
        except ImportError:
            print("⚠️ requests is not installed. Skipping Ayurveda AI health check.")
            requests_lib = None

        print("⏳ Loading AI Model into RAM (this can take up to 60s)...")
        for i in range(max_retries):
            # Check if process is still alive
            if ai_process.poll() is not None:
                stdout, _ = ai_process.communicate()
                print(f"❌ Ayurveda AI Engine crashed on startup:\n{stdout}")
                ai_process = None
                return

            if requests_lib is not None:
                try:
                    # Try to ping health endpoint
                    resp = requests_lib.get("http://127.0.0.1:8000/health", timeout=1)
                    if resp.status_code == 200:
                        print("✅ Ayurveda AI Engine ready and listening.")
                        return
                except Exception:
                    pass
            
            time.sleep(2)
            if i % 3 == 0:
                print(f"   ... still loading ({i*2}s passed)")

        print("⚠️ Ayurveda AI Engine is taking longer than usual to start. It might still load in the background.")
    except Exception as e:
        print(f"❌ Failed to start Ayurveda AI Engine: {e}")

def cleanup_ai():
    if ai_process:
        print("🛑 Shutting down Ayurveda AI Engine...")
        ai_process.terminate()

atexit.register(cleanup_ai)

with app.app_context():
    start_ayurveda_ai()
    print("🏔️ Pre-warming Clinical AI Engines (RAG/Gemini)...")
    try:
        get_rag_service()
        get_gemini_service()
        print("🚀 AI Engines Ready & Optimized.")
    except Exception as e:
        print(f"⚠️ Pre-warm notice: {e}")

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

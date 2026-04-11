"""
run.py — VaidyaMed-X Backend Entry Point

Uses gevent as the async worker instead of eventlet.
eventlet is incompatible with Python 3.14+ due to
the removal of _thread.start_joinable_thread.
"""
import os

# ── Gevent monkey-patch MUST be first ────────────────────────
from gevent import monkey
monkey.patch_all()

from app import create_app

app = create_app()

# 🏔️ Pre-warm AI Services for high-speed response
from app.controllers.ai_v2_controller import get_rag_service, get_gemini_service, get_biogpt_service
with app.app_context():
    print("🏔️ Pre-warming Clinical AI Engines (BioGPT/RAG)... This may take a few seconds.")
    try:
        get_rag_service()
        get_gemini_service()
        # BioGPT initialized safely
        get_biogpt_service() 
        print("🚀 AI Engines Ready & Optimized.")
    except Exception as e:
        print(f"⚠️ Pre-warm notice: {e} (Engines will load on request instead)")

from gevent.pywsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler

if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 'yes')
    port  = int(os.getenv('PORT', 5000))
    host  = os.getenv('HOST', '0.0.0.0')

    print(f"\nVaidyaMed-X Backend starting on http://{host}:{port}")
    print(f"   Async mode  : gevent (Explicit WSGI)")
    print(f"   Debug mode  : {debug}\n")

    http_server = WSGIServer((host, port), app, handler_class=WebSocketHandler)
    http_server.serve_forever()

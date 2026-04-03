import os
import logging
from app import app, socketio
from database import init_db

# Configure structured production logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("production_windows.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('socketio_server')
logger.setLevel(logging.INFO)

if __name__ == '__main__':
    # Ensure database is initialized
    init_db()
    
    # Set Flask env to production
    os.environ['FLASK_ENV'] = 'production'
    
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting VaidyaMed-X Server (Windows) on port {port} using Flask-SocketIO...")
    
    try:
        # Run with socketio (supports WebSockets)
        socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
    except Exception as e:
        logger.error(f"Server crashed: {e}")

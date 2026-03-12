import os
import logging
from waitress import serve
from app import app
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
logger = logging.getLogger('waitress')
logger.setLevel(logging.INFO)

if __name__ == '__main__':
    # Ensure database is initialized
    init_db()
    
    # Set Flask env to production
    os.environ['FLASK_ENV'] = 'production'
    
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting VaidyaMed-X Production Server (Windows) on port {port} using Waitress...")
    
    try:
        # Run with waitress (production grade WSGI for Windows)
        serve(app, host='0.0.0.0', port=port, threads=4)
    except Exception as e:
        logger.error(f"Server crashed: {e}")

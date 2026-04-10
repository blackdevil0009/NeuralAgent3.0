import eventlet
eventlet.monkey_patch()

import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 'yes')
    port  = int(os.getenv('PORT', 5000))
    host  = os.getenv('HOST', '0.0.0.0')

    print(f"\nVaidyaMed-X Backend starting on http://{host}:{port}")
    print(f"   Environment : {os.getenv('FLASK_ENV', 'development')}")
    print(f"   Debug mode  : {debug}\n")

    from app.extensions import socketio
    socketio.run(app, host=host, port=port, debug=debug)

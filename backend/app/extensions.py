"""
app/extensions.py — Shared Flask Extension Instances

All extensions are instantiated here (without app) and
initialised in create_app() via extension.init_app(app).
This avoids circular imports.
"""

from flask_sqlalchemy   import SQLAlchemy
from flask_migrate      import Migrate
from flask_jwt_extended import JWTManager
from flask_mail         import Mail
from flask_cors         import CORS
from flask_socketio     import SocketIO

db      = SQLAlchemy()
migrate = Migrate()
jwt     = JWTManager()
mail    = Mail()
socketio = SocketIO(
    cors_allowed_origins="*", # We refine this in init_app
    async_mode='gevent',
    ping_timeout=60,
    ping_interval=25,
    allow_upgrades=True,
    logger=True,
    engineio_logger=True,
    always_connect=True,
    manage_session=True
)

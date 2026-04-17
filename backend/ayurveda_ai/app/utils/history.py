import sqlite3
import json
import os
from .logger import logger

class ConversationHistory:
    def __init__(self, db_path="conversations.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    query TEXT,
                    response TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to initialize history DB: {e}")

    def add_entry(self, user_id, query, response):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO history (user_id, query, response) VALUES (?, ?, ?)",
                (user_id, query, response)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to save history entry: {e}")

    def get_context(self, user_id, limit=3):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT query, response FROM history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?",
                (user_id, limit)
            )
            rows = cursor.fetchall()
            conn.close()
            
            # Format as conversation string
            context = ""
            for row in reversed(rows):
                context += f"User: {row[0]}\nAI: {row[1]}\n"
            return context
        except Exception as e:
            logger.error(f"Failed to retrieve context: {e}")
            return ""

history_manager = ConversationHistory()

import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()

def migrate():
    with app.app_context():
        # 1. Add gamification columns to users table
        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN pop_coin_balance INTEGER NOT NULL DEFAULT 0;"))
            print("[SUCCESS] Added pop_coin_balance column to users table.")
        except Exception as e:
            print(f"[WARNING] pop_coin_balance might already exist: {e}")

        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN achievement_level VARCHAR(50) NOT NULL DEFAULT 'Beginner';"))
            print("[SUCCESS] Added achievement_level column to users table.")
        except Exception as e:
            print(f"[WARNING] achievement_level might already exist: {e}")

        # 2. Create pop_coin_transactions table
        try:
            db.session.execute(text("""
                CREATE TABLE pop_coin_transactions (
                    id INTEGER NOT NULL AUTO_INCREMENT, 
                    user_id INTEGER NOT NULL, 
                    amount INTEGER NOT NULL, 
                    transaction_type ENUM('earned','redeemed') NOT NULL, 
                    activity VARCHAR(100) NOT NULL, 
                    description VARCHAR(255), 
                    created_at DATETIME NOT NULL, 
                    PRIMARY KEY (id), 
                    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """))
            print("[SUCCESS] Created pop_coin_transactions table.")
        except Exception as e:
            print(f"[WARNING] pop_coin_transactions table might already exist: {e}")

        # 3. Create user_streaks table
        try:
            db.session.execute(text("""
                CREATE TABLE user_streaks (
                    id INTEGER NOT NULL AUTO_INCREMENT, 
                    user_id INTEGER NOT NULL, 
                    activity_type VARCHAR(50) NOT NULL, 
                    current_streak INTEGER NOT NULL DEFAULT 0, 
                    longest_streak INTEGER NOT NULL DEFAULT 0, 
                    last_activity_date DATE, 
                    updated_at DATETIME NOT NULL, 
                    PRIMARY KEY (id), 
                    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """))
            print("[SUCCESS] Created user_streaks table.")
        except Exception as e:
            print(f"[WARNING] user_streaks table might already exist: {e}")

        db.session.commit()
        print("[SUCCESS] Migration complete!")

if __name__ == '__main__':
    migrate()

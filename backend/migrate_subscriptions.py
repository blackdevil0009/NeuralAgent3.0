import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'), override=True)

import pymysql

DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_NAME = os.getenv('DB_NAME', 'vaidyamed_x')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASSWORD', '')

conn = pymysql.connect(
    host=DB_HOST, port=DB_PORT, db=DB_NAME,
    user=DB_USER, password=DB_PASS,
    charset='utf8mb4', autocommit=True,
)

with conn.cursor() as cur:
    print("\n[patient_subscriptions] Creating table...")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS patient_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_name VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        status ENUM('active', 'expired', 'cancelled', 'pending') NOT NULL DEFAULT 'pending',
        start_date DATETIME NULL,
        end_date DATETIME NULL,
        razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
        razorpay_payment_id VARCHAR(100) NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

conn.close()
print("\nSubscriptions migration complete.\n")

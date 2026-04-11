"""
migrate_payment_columns.py — One-time migration script

Adds new payment-related columns to the existing 'appointments' table.
Run this once: python migrate_payment_columns.py

Safe to run multiple times — uses ALTER TABLE only if column doesn't exist.
"""
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'), override=True)

import pymysql
import urllib.parse

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_NAME = os.getenv('DB_NAME', 'vaidyamed_x')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASSWORD', '')

conn = pymysql.connect(
    host=DB_HOST, port=DB_PORT, db=DB_NAME,
    user=DB_USER, password=DB_PASS,
    charset='utf8mb4', autocommit=True,
)

def column_exists(cursor, table, column):
    cursor.execute(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_schema=%s AND table_name=%s AND column_name=%s",
        (DB_NAME, table, column)
    )
    return cursor.fetchone()[0] > 0

def add_column(cursor, table, column, definition):
    if not column_exists(cursor, table, column):
        cursor.execute(f"ALTER TABLE `{table}` ADD COLUMN `{column}` {definition}")
        print(f"  + Added: {table}.{column}")
    else:
        print(f"  = Exists: {table}.{column}")

with conn.cursor() as cur:
    print("\n[appointments] Adding payment columns...")

    add_column(cur, 'appointments', 'purpose',
               "VARCHAR(300) NULL DEFAULT ''")
    add_column(cur, 'appointments', 'amount_paid',
               "INT NULL DEFAULT 0")
    add_column(cur, 'appointments', 'razorpay_order_id',
               "VARCHAR(100) NULL")
    add_column(cur, 'appointments', 'razorpay_payment_id',
               "VARCHAR(100) NULL")
    add_column(cur, 'appointments', 'razorpay_signature',
               "VARCHAR(256) NULL")
    add_column(cur, 'appointments', 'transaction_id',
               "VARCHAR(100) NULL")
    add_column(cur, 'appointments', 'payment_status',
               "ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending'")
    add_column(cur, 'appointments', 'doctor_share',
               "INT NULL DEFAULT 0")
    add_column(cur, 'appointments', 'platform_share',
               "INT NULL DEFAULT 0")

    print("\n[appointments] Adding indexes...")
    # Safe index creation (ignore if exists)
    try:
        cur.execute("ALTER TABLE appointments ADD INDEX idx_payment_status (payment_status)")
        print("  + Index: payment_status")
    except pymysql.err.OperationalError as e:
        if 'Duplicate key' in str(e) or '1061' in str(e):
            print("  = Index already exists: payment_status")

    print("\n[payment_transactions] Creating table if not exists...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS `payment_transactions` (
            `id`                  INT AUTO_INCREMENT PRIMARY KEY,
            `appointment_id`      INT NOT NULL,
            `user_id`             INT NOT NULL,
            `doctor_id`           INT NULL,
            `razorpay_order_id`   VARCHAR(100) NOT NULL,
            `razorpay_payment_id` VARCHAR(100) NULL,
            `razorpay_signature`  VARCHAR(256) NULL,
            `amount`              INT NOT NULL,
            `currency`            VARCHAR(5) NOT NULL DEFAULT 'INR',
            `doctor_share`        INT NULL,
            `platform_share`      INT NULL,
            `status`              ENUM('created','captured','failed','refunded') NOT NULL DEFAULT 'created',
            `transfer_id`         VARCHAR(100) NULL,
            `transfer_status`     VARCHAR(50) NULL,
            `notes`               TEXT NULL,
            `failure_reason`      VARCHAR(300) NULL,
            `created_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_apt_id`   (`appointment_id`),
            INDEX `idx_user_id`  (`user_id`),
            INDEX `idx_order_id` (`razorpay_order_id`),
            INDEX `idx_pay_id`   (`razorpay_payment_id`),
            INDEX `idx_status`   (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)
    print("  + payment_transactions table ready.")

    # Backfill: mark all existing confirmed appointments as 'paid'
    cur.execute("""
        UPDATE appointments
        SET payment_status = 'paid'
        WHERE status IN ('confirmed', 'completed', 'Confirmed', 'Completed')
          AND payment_status = 'pending'
    """)
    rows = cur.rowcount
    print(f"\n  Backfilled {rows} existing confirmed appointments → payment_status='paid'")

conn.close()
print("\nMigration complete.\n")

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
    print("\n[users] Adding missing columns...")

    add_column(cur, 'users', 'hospital_id', "INT NULL")
    add_column(cur, 'users', 'is_verified', "BOOLEAN NOT NULL DEFAULT FALSE")
    add_column(cur, 'users', 'verification_code', "VARCHAR(10) NULL")
    add_column(cur, 'users', 'is_active', "BOOLEAN NOT NULL DEFAULT TRUE")
    add_column(cur, 'users', 'is_email_verified', "BOOLEAN NOT NULL DEFAULT FALSE")
    add_column(cur, 'users', 'terms_agreed', "BOOLEAN NOT NULL DEFAULT FALSE")
    add_column(cur, 'users', 'two_fa_enabled', "BOOLEAN NOT NULL DEFAULT FALSE")
    add_column(cur, 'users', 'two_fa_secret', "VARCHAR(64) NULL DEFAULT ''")

conn.close()
print("\nUsers migration complete.\n")

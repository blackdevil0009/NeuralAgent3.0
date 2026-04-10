-- ─────────────────────────────────────────────────────────────
--  VaidyaMed-X — MySQL Database Initialisation Script
--
--  Run this ONCE on a fresh MySQL server:
--    mysql -u root -p < init_db.sql
--
--  The Flask app (via SQLAlchemy) will CREATE the tables
--  automatically on first boot. This script only sets up
--  the database and user.
-- ─────────────────────────────────────────────────────────────

-- 1. Create the database with proper charset
CREATE DATABASE IF NOT EXISTS vaidyamed_x
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. (Optional) Create a dedicated application user
--    Change 'YourPassword123!' to a strong password and update .env
-- CREATE USER IF NOT EXISTS 'vaidyamed'@'localhost'
--   IDENTIFIED BY 'YourPassword123!';
-- GRANT ALL PRIVILEGES ON vaidyamed_x.* TO 'vaidyamed'@'localhost';
-- FLUSH PRIVILEGES;

-- 3. Switch to the new database
USE vaidyamed_x;

-- ─────────────────────────────────────────────────────────────
--  NOTE: Table creation is handled by SQLAlchemy (db.create_all)
--  on app startup via app/__init__.py — you do NOT need to
--  run CREATE TABLE statements manually.
--
--  To run migrations after schema changes:
--    flask db migrate -m "description"
--    flask db upgrade
-- ─────────────────────────────────────────────────────────────

SELECT 'Database vaidyamed_x is ready.' AS status;

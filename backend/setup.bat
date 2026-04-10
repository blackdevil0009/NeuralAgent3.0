@echo off
REM ─────────────────────────────────────────────────────────────
REM  VaidyaMed-X Backend — Windows Setup Script
REM  Run: setup.bat
REM ─────────────────────────────────────────────────────────────

echo.
echo ============================================================
echo   VaidyaMed-X Backend Setup (MySQL + Flask)
echo ============================================================
echo.

REM 1. Create virtual environment
echo [1/5] Creating Python virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+ first.
    pause & exit /b 1
)

REM 2. Activate venv
echo [2/5] Activating virtual environment...
call venv\Scripts\activate.bat

REM 3. Upgrade pip
echo [3/5] Upgrading pip...
python -m pip install --upgrade pip --quiet

REM 4. Install dependencies
echo [4/5] Installing Python packages...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Package installation failed.
    pause & exit /b 1
)

REM 5. Copy .env if missing
echo [5/5] Checking .env file...
if not exist .env (
    copy .env.example .env
    echo   .env created from template. Please edit it with your MySQL credentials.
) else (
    echo   .env already exists.
)

echo.
echo ============================================================
echo   Setup complete!
echo.
echo   Next steps:
echo   1. Edit .env  ^(set DB_USER, DB_PASSWORD, MAIL_USERNAME etc.^)
echo   2. Run MySQL and execute:  mysql -u root -p ^< init_db.sql
echo   3. Start the server:       venv\Scripts\python run.py
echo ============================================================
echo.
pause

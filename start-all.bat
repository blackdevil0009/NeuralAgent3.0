@echo off
echo =========================================
echo VaidyaMed-X Full Stack Launcher
echo =========================================

echo Starting Python Backend...
start cmd /k "cd backend && call venv\Scripts\activate.bat && python run.py"

echo Starting React Frontend and IRIS-Mini Voice Agent...
start cmd /k "cd frontend && npm run dev:all"

echo Both systems are starting up! 
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
echo IRIS-Mini: http://localhost:6753
pause

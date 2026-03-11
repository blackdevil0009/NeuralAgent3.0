@echo off
title NeuralAgent Backend Server
cd /d d:\NeuralAgent3.0\backend

:loop
echo =========================================
echo Starting NeuralAgent Backend...
echo =========================================
d:\NeuralAgent3.0\.venv\Scripts\python.exe app.py

echo.
echo Backend exited or crashed with code %errorlevel%.
echo Restarting in 5 seconds...
timeout /t 5
goto loop

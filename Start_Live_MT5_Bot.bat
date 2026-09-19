@echo off
title Raghav Forex Scalper AI - MT5 Live Trading Bridge
color 0A
echo ================================================================
echo       ⚡ RAGHAV FOREX SCALPER AI - MT5 LIVE TRADING BOT ⚡
echo ================================================================
echo.
echo [1/3] Checking Python & MetaTrader 5 Bridge...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    pause
    exit /b 1
)

echo [2/3] Checking MetaTrader 5 Desktop Application...
if exist "C:\Program Files\MetaTrader 5\terminal64.exe" (
    echo [FOUND] MetaTrader 5 Desktop detected at:
    echo         C:\Program Files\MetaTrader 5\terminal64.exe
) else (
    echo [NOTICE] If MT5 is installed elsewhere, please launch MT5 manually.
)

echo.
echo [3/3] Launching Raghav Forex Scalper AI Bridge Server...
echo       Web Terminal: http://127.0.0.1:5000/
echo.
echo ----------------------------------------------------------------
echo  * Orders placed from the terminal will execute directly in MT5!
echo  * Keep this console window OPEN while trading.
echo  * Press Ctrl+C to stop the bot server anytime.
echo ----------------------------------------------------------------
echo.

REM Open web browser after 2 seconds
start "" powershell -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5000/'"

REM Run the python server
python "%~dp0mt5_live_server.py"

pause

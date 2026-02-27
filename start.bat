@echo off
title KAIROS PRO v3.5 Launcher
echo.
echo ===== KAIROS PRO v3.5 - The Execution Layer =====
echo.
echo [1/3] Starting Brain (Monte Carlo) on :8400...
start "KAIROS Brain" cmd /k "cd /d d:\KAIROS\brain && venv\Scripts\python.exe -m uvicorn main:app --reload --port 8400 --host 0.0.0.0"
ping 127.0.0.1 -n 4 >nul

echo [2/3] Starting Hub (Committee + Price Pulse) on :8300...
start "KAIROS Hub" cmd /k "cd /d d:\KAIROS\hub && npx tsx watch src/index.ts"
ping 127.0.0.1 -n 4 >nul

echo [3/3] Starting Eyes (Command Center) on :5173...
start "KAIROS Eyes" cmd /k "cd /d d:\KAIROS\client && npm run dev"
ping 127.0.0.1 -n 3 >nul

echo.
echo ===== KAIROS v3.5 Execution Layer - LIVE =====
echo.
echo   Brain:    http://localhost:8400
echo   Hub:      http://localhost:8300
echo   UI:       http://localhost:5173
echo.
echo   Pipeline: Scraper + Journalist + Watcher + Prediction
echo   Pulse:    2-second real-time price stream
echo   Threshold: 70%% bi-directional signal
echo   Interval: Candle-Close Sync (auto-trigger)
echo.
start "" http://localhost:5173
pause

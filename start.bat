@echo off
TITLE SaNDS Lab - CCTV Face Attendance System Launcher (Port 4040)
COLOR 0B
echo ============================================================
echo   SaNDS Lab Middle East W.L.L - CCTV AI Face Attendance
echo   Multi-Gate Biometrics & CCTV Live Monitoring System
echo ============================================================
echo.

:: 1. Check & Start PHP Middleware on Port 8000
echo [1/3] Checking PHP Middleware (Port 8000)...
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       - PHP API Middleware is already active on port 8000.
) else (
    echo       - Starting PHP API Middleware on 127.0.0.1:8000...
    start "SaNDS Lab Attendance API" /B php -S 127.0.0.1:8000 -t backend
)

:: 2. Check & Start Python AI Camera Engine on Port 8001
echo [2/3] Checking Offline Face AI Engine (Port 8001)...
netstat -ano | findstr /R /C:":8001 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       - Python AI Camera Engine is already active on port 8001.
) else (
    echo       - Starting Python AI Camera Engine on 127.0.0.1:8001...
    start "SaNDS Lab Camera Stream & AI Worker" /B python engine/camera_worker.py
)

:: 3. Check & Start React Web Frontend on Port 4040
echo [3/3] Checking React Web Application (Port 4040)...
netstat -ano | findstr /R /C:":4040 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       - React Web App is already active on port 4040.
) else (
    echo       - Starting React Web App on port 4040...
    cd frontend
    start "SaNDS Lab React Web App (Port 4040)" npm run dev
    cd ..
)

:: Wait 2 seconds and automatically open browser at http://localhost:4040
timeout /t 2 /nobreak >nul
start http://localhost:4040

echo.
echo ============================================================
echo  SYSTEM ONLINE (PORT 4040)
echo ============================================================
echo  - Web Application : http://localhost:4040
echo  - PHP Backend API : http://127.0.0.1:8000/api
echo  - Live AI Engine  : http://127.0.0.1:8001/status
echo  - Camera 1 (IN)   : 192.168.100.114 (Port 554 RTSP)
echo  - Camera 2 (OUT)  : 192.168.100.113 (Port 554 RTSP)
echo  - Offline Face AI : OpenCV YuNet + SFace Local Biometrics
echo ============================================================
echo.
echo Application running at http://localhost:4040. Keep this window open.
pause

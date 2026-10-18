@echo off
TITLE SaNDS Lab - CCTV Face Attendance System Launcher
echo ============================================================
echo   SaNDS Lab Middle East W.L.L - CCTV AI Face Attendance
echo ============================================================
echo [1/3] Starting PHP Middleware on port 8000...
start "SaNDS Lab Attendance API" /B php -S 127.0.0.1:8000 -t backend

echo [2/3] Starting Camera Worker & Offline Face AI Engine on port 8001...
start "SaNDS Lab Camera Stream & AI Worker" /B python engine/camera_worker.py

echo [3/3] Starting ReactJS Web Frontend on port 5173...
cd frontend
start "SaNDS Lab React Frontend" npm run dev -- --host
cd ..

echo.
echo ============================================================
echo System Online:
echo - Web Application: http://localhost:5173
echo - Live Camera Feed: http://127.0.0.1:8001/video_feed/1
echo - PHP Backend API: http://127.0.0.1:8000/api
echo - CCTV Camera IP : 192.168.100.113 (Port 554 RTSP)
echo - Offline Face AI: OpenCV YuNet + SFace Local
echo ============================================================
pause

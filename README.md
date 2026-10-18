# CCTVAttendance V1.0
### SaNDS Lab Middle East W.L.L - CCTV AI Multi-Gate Face Attendance System

A high-performance, offline-first CCTV facial recognition attendance system designed for schools, universities, offices, and commercial facilities. Built with ReactJS, PHP Middleware, MySQL, and local OpenCV Deep Learning face models (YuNet + SFace).

---

## Key Features

1. **Dual & Multi-Camera Gate Architecture**:
   - Supports unlimited cameras grouped as IN (Entry) and OUT (Exit) gates.
   - Configured with CCTV Camera `192.168.100.113` on Port 554 (RTSP).
2. **Multi-Trip & Daily Timesheet Calculations**:
   - Accurately tracks **First IN** and **Last OUT**.
   - Calculates **Outings / Trips Count** (how many times a person went out).
   - Computes **Total Productive Hours Inside** and **Total Break Hours Outside**.
   - Compares with Shift schedules to flag **Present**, **Late**, **Half-Day**, or **Under-Time**.
3. **100% Offline Deep Learning Face Biometrics**:
   - OpenCV YuNet (Face Detector) + SFace (Face Feature Extractor) running locally in `engine/models/`.
   - Zero cloud API dependency, zero external network traffic, and no subscription costs.
4. **GCC & India Localization**:
   - Full timezone support: Bahrain, UAE, Saudi Arabia, Qatar, Kuwait, Oman, and India (IST).
   - Multi-currency: BHD, SAR, AED, QAR, KWD, OMR, INR, USD.
   - Customizable Date (`DD/MM/YYYY`) and Time (`12h` / `24h`) formats.
5. **Two-Way Synchronization with HR Solution (`hr_solution_db`)**:
   - Can run **100% Standalone** or **Synchronized**.
   - One-click import of employees from `hr_solution_db.employees`.
   - Automatic push of daily attendance into `hr_solution_db.attendance`.
6. **Customizable Horizontal Navigation & Branding**:
   - Horizontal top navigation bar.
   - Default Light theme with instant Dark theme switcher.
   - User-customizable Header & Menu colors (Default: Royal Blue `#1e3a8a` & Pink `#ec4899`).
   - Official SaNDS Lab logo integration.
   - Mandated Footer: *Powerd & Enginered By SaNDS Lab Middle East W.L.L All right Reserved*.

---

## Directory Structure

```
e:\faceAttendance\
├── backend\                 # PHP REST API Middleware
│   ├── config\              # PDO Database & CORS headers
│   ├── helpers\             # Attendance Calculator & JSON responses
│   └── api\                 # Endpoints (attendance, users, cameras, shifts, settings, hr_sync, reports)
├── frontend\                # ReactJS + Vite Web Application
│   ├── src\
│   │   ├── components\      # Header (Horizontal Menu) & Footer
│   │   ├── views\           # Live Monitor, Dashboard, Timesheet, Users, Cameras, Shifts, HR Sync, Reports, Settings
│   │   └── api.js           # Frontend API client
│   └── public\logos\        # SaNDS Lab official branding assets
├── engine\                  # Python Offline Face AI Engine
│   ├── models\              # YuNet (~232 KB) & SFace (~38 MB) ONNX models
│   ├── face_engine.py       # 128-d vector extractor and cosine matcher
│   └── camera_worker.py     # Real-time RTSP stream ingest & auto-punch loop
├── database\
│   └── schema.sql           # MySQL database schema (cctv_attendance)
└── start.bat                # One-click launcher for PHP and React
```

---

## Quick Start

1. Start both the PHP API and React frontend:
   ```cmd
   start.bat
   ```
2. Open your browser:
   * **Web Application**: [http://localhost:5173](http://localhost:5173)
   * **PHP API**: [http://127.0.0.1:8000/api](http://127.0.0.1:8000/api)

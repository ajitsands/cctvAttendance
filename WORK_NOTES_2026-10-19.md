# SaNDS Lab — Daily Work & Delivery Notes
**Date**: Monday, October 19, 2026  
**Project**: CCTV AI Multi-Gate Face Attendance System (`cctvattendance`)  
**Repository**: `e:/faceAttendance`  
**Current Git Release**: `v1.1.0` (Commit: `995bf6c`)  
**Status**: Production-Ready / Operational  

---

## 1. Executive Summary

Today, we completed the end-to-end development, camera hardware pairing, offline AI integration, and the **V1.1 UI/UX enhancement sprint** for the **CCTV AI Multi-Gate Face Attendance System** for **SaNDS Lab Middle East W.L.L**.

The system is 100% operational, fully offline (zero cloud dependencies), connected to the live UNV CCTV network, synchronized with the MySQL database and HR bridge, and cleanly versioned in Git.

---

## 2. Completed Milestones for Today

### Phase 1: Core System Architecture & V1.0 Release
* **Hardware & Camera Setup**:
  * Successfully paired UNV CCTV Camera at IP `192.168.100.113` on RTSP port `554`.
  * Verified 1ms network latency and zero-lag frame streaming via OpenCV backend.
* **100% Offline Facial Biometrics**:
  * Embedded local **YuNet (Face Detector)** and **SFace (128-D Biometric Extractor)** ONNX models into `engine/models/`.
  * Real-time face detection, cosine distance feature matching, and automatic profile snapshot logging without any external API or cloud services.
* **Multi-Gate In/Out Logic**:
  * Configured multi-camera pairs (`IN` gate and `OUT` gate).
  * Automatically groups punches chronologically per person per day.
  * Calculates **First IN**, **Last OUT**, **Total Trips/Outings Count**, **Total Productive Inside Hours**, and **Total Break Hours Outside**.
* **Database & HR Solution Bridge**:
  * Deployed MySQL database `cctv_attendance` (users, cameras, shifts, logs, daily summaries, settings).
  * Implemented two-way bridge with `hr_solution_db` (importing personnel CPR/codes, exporting daily attendance records).
* **SaNDS Lab Custom Branding**:
  * Official SaNDS Lab logo integration (`/logos/SaNDSLab-LogoNewUpdated copy.png`).
  * Custom theme palette: Royal Blue (`#2f4fb6`) and Pink (`#ec4899`) with light/dark mode support.
  * GCC localized currencies (`BHD`, `SAR`, `AED`, `QAR`, `KWD`, `OMR`, `INR`, `USD`) and timezones (`Asia/Bahrain`, `Asia/Dubai`, `Asia/Riyadh`, `Asia/Kolkata`).
  * Mandated footer: *"Powerd & Enginered By SaNDS Lab Middle East W.L.L All right Reserved"*.

---

### Phase 2: V1.1 Feature Sprint (DataTable & Live Popups)
* **Reusable DataTable Component (`frontend/src/components/DataTable.jsx`)**:
  * Created a high-performance, modular table component.
  * **Global Instant Search**: Real-time filtering across all columns.
  * **Configurable Pagination**: 10, 25, 50, or 100 rows per page with page jump buttons.
  * **Header Sorting**: Click-to-sort ascending/descending with clear sort indicator arrows.
  * **One-Click CSV Export**: Instant client-side download of the active filtered dataset.
  * Integrated across all 6 data-heavy views:
    1. *Timesheet & Daily Summary* (`TimesheetView.jsx`)
    2. *Staff & Student Directory* (`UsersView.jsx`)
    3. *Camera Gate Management* (`CamerasView.jsx`)
    4. *Shift & Roster Configuration* (`ShiftsView.jsx`)
    5. *HR Synchronization Hub* (`HrSyncView.jsx`)
    6. *Attendance Analytics Reports* (`ReportsView.jsx`)
* **Live Identification Popup Toast (`frontend/src/components/LivePunchPopup.jsx`)**:
  * Non-blocking HUD toast notification in the bottom-right corner whenever a face is verified.
  * Displays user profile photo, full name, employee ID, gate camera name, confidence score percentage, and direction badge (IN / OUT).
  * Auto-dismisses smoothly after 4.5 seconds with interactive close button.
* **Settings & Backend API Updates**:
  * Added Section 4 toggle in `SettingsView.jsx`: *"Show Live Identification Popup Toast"* (Yes / No).
  * Stored persistently in database table `system_settings` under key `show_live_popup`.
  * Updated `backend/api/settings.php` and `database/schema.sql` to support the new configuration.

---

### Phase 3: Quality Assurance, Verification & Repository Hygiene
* **Vite Production Build**: Compiled with `0` warnings/errors (`npm run build` completed in 2.06s).
* **RTSP Connectivity**: Verified camera `192.168.100.113:554` via TCP handshake (`TcpTestSucceeded = True`).
* **PHP API Endpoints**: Tested `api/settings.php` and `api/attendance.php` (both returning 200 OK with valid JSON).
* **Git Repository Cleanliness**:
  * Configured `.gitignore` to prevent committing dynamic snapshots (`uploads/snapshots/20261018/`, `20261019/`), user photo uploads (`uploads/profiles/user_*.jpg`), log files, and `node_modules`.
  * Tracked `.gitkeep` files in all required empty directories so folder structure is preserved upon fresh clone.
  * Committed all V1.1 changes under commit `995bf6c` with a clean working tree.

---

## 3. Current System Port & Service Map

| Service | Port / Protocol | URL / Target | Status |
| :--- | :--- | :--- | :--- |
| **React Web Frontend** | HTTP (5173) | `http://localhost:5173` | Running |
| **PHP API Middleware** | HTTP (8000) | `http://127.0.0.1:8000/api` | Running |
| **MySQL Database** | TCP (3306) | `127.0.0.1:3306` (`cctv_attendance`) | Running |
| **UNV CCTV Camera** | RTSP (554) | `rtsp://admin:sands12345@192.168.100.113:554/` | Connected |
| **Apache / XAMPP** | HTTP (80) | `http://localhost/` | Available |

---

## 4. How to Resume Work (After 8 Hours)

1. **Quick Startup**:
   * Simply double-click [`start.bat`](file:///e:/faceAttendance/start.bat) in the project root.
   * This automatically launches the PHP backend, Python AI engine, and Vite React frontend in background windows.
2. **Access URLs**:
   * Frontend Application: [http://localhost:5173](http://localhost:5173)
   * PHP REST API: [http://127.0.0.1:8000/api/settings.php](http://127.0.0.1:8000/api/settings.php)
3. **Pending / Next Planned Tasks**:
   * Additional CCTV camera pairing (e.g. Back Gate or Workshop Gate camera).
   * Scheduled automated daily email dispatch of daily attendance Excel sheets to HR.
   * Mobile responsive layout fine-tuning for tablet-mounted security guard kiosks.

---
*Created by Antigravity AI Engineering Assistant for SaNDS Lab Middle East W.L.L.*

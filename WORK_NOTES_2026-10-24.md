# SaNDS Lab — Daily Work & Delivery Notes
**Date**: Saturday, October 24, 2026  
**Project**: CCTV AI Multi-Gate Face Attendance & Security Intelligence Platform (`cctvattendance`)  
**Repository**: `e:/faceAttendance`  
**Current Git Release**: `v2.1.0` (Commit: `484880d`)  
**Status**: Production-Ready / Operational & Locked  

---

## 1. Executive Summary

Today, we successfully delivered, verified, and locked the **V2.1.0 Feature Milestone** for the **SaNDS Lab CCTV AI Multi-Gate Face Attendance & Security Platform**.

This release expands the platform beyond employee attendance into full-spectrum **Visitor & Security Intelligence**, delivering automated companion/group surveillance capture, a 31-day Monthly Attendance Matrix reporting engine, an Archive Vault with permanent purge lifecycle, and bulk operational controls.

All changes have been compiled, verified via production build, committed, tagged as **`v2.1.0`**, and pushed to GitHub (`origin/v2.1-dev`).

---

## 2. Completed Milestones for Release v2.1.0

### Phase 1: Consolidated Security & Navigation Menu
* Consolidated standalone security screens into a single, intuitive dropdown menu:
  * **Guests & Customers** (`#/guests`)
  * **Security & Blacklist** (`#/blacklist`)
  * **Try to Tamper Area** (`#/tamper-logs`)
* Streamlined the top navigation bar while keeping access immediate for security staff.

### Phase 2: 1 to 31 Days Monthly Attendance Matrix Report
* Created the **Monthly Attendance Matrix Report** inside the Reports module (`frontend/src/views/ReportsView.jsx`):
  * Dynamic day columns from **1 to 31** based on the chosen year and month.
  * Employee-wise daily schedule cards showing **IN time**, **OUT time**, **Total Working Hours (TWH)**, and **Late / Early status**.
  * Aggregated summary column: Total Hours worked vs Expected Hours, Total Late Hours, and Total Early Departures.
  * Dedicated **Landscape Print Layout**:
    * Clean landscape CSS pagination (`@page { size: landscape; }`).
    * Clear white header fonts for table titles.
    * Holidays and weekends prominently highlighted in red (`#ef4444`).
    * Full 31 days rendered seamlessly across the landscape sheet.
  * Updated official footer branding across Web and PDF prints to:
    *"Offline Edge SaNDS Lab AI Engine"*.

### Phase 3: Dual Surveillance Capture (Face Portrait + Wide-Angle Scene)
* **Automatic Wide-Angle Frame Capture (`engine/camera_worker.py`)**:
  * Whenever a visitor or guest is detected, the AI engine now captures two simultaneous images:
    1. **Biometric Face Crop** (`uploads/guests/guest_*.jpg`): For facial feature matching and avatar preview.
    2. **Wide-Angle Full Camera Scene** (`uploads/guests/full_*.jpg`): The uncropped surveillance frame.
  * Enables security and management to immediately determine whether a visitor arrived **alone** or as part of a **group / companion gathering**.

### Phase 4: High-Resolution Identification Popup
* **Enlarged CCTV Identification Modal (`frontend/src/views/GuestsView.jsx`)**:
  * Enlarged maximum width from the compact view to **`1,250px`** for the Wide-Angle Scene tab and **`1,000px`** for the Face Portrait Crop tab.
  * Face portrait container enlarged to **320px &times; 320px**.
  * Full Camera Scene frame container enlarged to **540px** height with high-res zoom link.
  * Responsive max-height (`92vh`) with smooth vertical scroll to ensure seamless viewing on all laptop and desktop monitors.

### Phase 5: Visitor Archive Vault & Data Lifecycle
* **Database Migration (`database/migrate_v2_1.php`)**:
  * Added `is_archived TINYINT(1) DEFAULT 0` and `archived_at DATETIME NULL` to the `guests` table with indexing.
* **Archived Visitors Vault**:
  * Integrated **Active Visitors & Guests** vs **Archived Visitors Vault** switcher tabs.
  * Visitors moved to Archive are automatically excluded from the Python face recognition engine so they are no longer tracked as active guests at gates.
  * Strict lifecycle enforcement:
    * Records in Archive can either be **Restored to Active** or **Permanently Deleted from the System**.
    * Permanent delete cascades and cleans up visitor logs, biometric embeddings, and uploaded image files.

### Phase 6: Multi-Selection & Bulk Security Actions
* **Multi-Row Selection Toolbar**:
  * Added interactive checkboxes to the visitor table with a "Select All" header toggle.
  * Floating / sticky bulk actions toolbar:
    * **Move to Archive**: Bulk transfer to vault.
    * **Move to Try to Tamper Area**: Instant audit escalation to the anti-spoof/tamper ledger (`tamper_logs`).
    * **Multiple Delete**: Bulk removal with safety confirmation modal.
    * **Restore to Active**: Bulk restore from Archive back to active gate recognition.

---

## 3. Current System Port & Service Map

| Service | Port / Protocol | URL / Target | Status |
| :--- | :--- | :--- | :--- |
| **Vite React Web Frontend** | HTTP (4040) | `http://localhost:4040` | Running & Verified |
| **PHP API Middleware** | HTTP (8000) | `http://127.0.0.1:8000/api` | Running & Verified |
| **Python Face AI Engine** | HTTP / TCP (8001) | `http://127.0.0.1:8001` | Running & Daemonized |
| **MySQL Database** | TCP (3306) | `127.0.0.1:3306` (`cctv_attendance`) | Migrated & Healthy |
| **UNV CCTV Camera** | RTSP (554) | `rtsp://admin:sands12345@192.168.100.113:554/` | Connected & Streaming |

---

## 4. Git Versioning Record

* **Branch**: `v2.1-dev`
* **Release Tag**: **`v2.1.0`**
* **Latest Commit Hash**: `484880d72177de308ec7f60ca318a57dc37fae96`
* **Commit Subject**: `feat(v2.1): visitor archive vault, multi-select bulk delete, tamper transfer, and enlarged identification popup`
* **Remote Status**: Synchronized with `origin/v2.1-dev` on GitHub (`https://github.com/ajitsands/cctvAttendance.git`).

---

## 5. How to Resume Work (After 8 Hours)

1. **Launch Services**:
   * Double-click [`start_4040.bat`](file:///e:/faceAttendance/start_4040.bat) or run:
     ```powershell
     cd e:\faceAttendance
     # Start PHP backend:
     php -S 127.0.0.1:8000 -t backend
     # Start Python camera engine:
     python engine/camera_worker.py
     # Start Frontend on port 4040:
     cd frontend && npm run dev -- --port 4040
     ```
2. **Access URLs**:
   * **Frontend Application**: [http://localhost:4040](http://localhost:4040)
   * **Visitors & Guests Module**: [http://localhost:4040/#/guests](http://localhost:4040/#/guests)
   * **Monthly Matrix Report**: [http://localhost:4040/#/reports](http://localhost:4040/#/reports)
   * **Backend API Health**: [http://127.0.0.1:8000/api/settings.php](http://127.0.0.1:8000/api/settings.php)
3. **Branch & Workspace**:
   * Branch `v2.1-dev` is locked at release tag `v2.1.0`.
   * When starting the next version in 8 hours, we can branch to `v2.2-dev` or continue with the next prioritized feature set.

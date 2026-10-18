-- CCTV Face Attendance Database Schema
-- Developed for SaNDS Lab Middle East W.L.L
-- Supports Multi-Camera, Gates/Doors IN-OUT, GCC & India Localization, Offline Face AI, HR Solution Sync

CREATE DATABASE IF NOT EXISTS `cctv_attendance` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `cctv_attendance`;

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS `system_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL UNIQUE,
    `setting_value` TEXT NULL,
    `group_name` VARCHAR(50) DEFAULT 'general',
    `description` VARCHAR(255) NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Default Settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `group_name`, `description`) VALUES
('company_name', 'SaNDS Lab Middle East W.L.L', 'branding', 'Company / School Organization Name'),
('logo_url', '/logos/SaNDSLab-LogoNewUpdated copy.png', 'branding', 'Header Logo Image Path'),
('footer_text', 'Powerd & Enginered By SaNDS Lab Middle East W.L.L All right Reserved', 'branding', 'Application Footer Text'),
('timezone', 'Asia/Bahrain', 'localization', 'Active Timezone (e.g. Asia/Bahrain, Asia/Dubai, Asia/Riyadh, Asia/Kolkata)'),
('currency', 'BHD', 'localization', 'Default Currency Code (BHD, SAR, AED, QAR, KWD, OMR, INR, USD)'),
('date_format', 'DD/MM/YYYY', 'localization', 'Display Date Format (DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY)'),
('time_format', '12h', 'localization', 'Time Display Format (12h or 24h)'),
('theme_header_color', '#1e40af', 'theme', 'Custom Header Color (Default Royal Blue)'),
('theme_menu_color', '#ec4899', 'theme', 'Custom Menu Accent Color (Default Pink)'),
('theme_mode', 'light', 'theme', 'Default Theme Mode (light or dark)'),
('app_mode', 'office', 'system', 'Operation Mode (office or school)'),
('face_match_threshold', '0.65', 'ai', 'Face Match Cosine Similarity Threshold (0.50 - 0.90)'),
('punch_cooldown_seconds', '60', 'ai', 'Cooldown seconds between consecutive punches for same person on same camera'),
('show_live_popup', '1', 'ui', 'Show Real-Time Identification Popup Toast (1=Yes, 0=No)'),
('hr_sync_enabled', '1', 'hr_integration', 'Enable synchronization with hr_solution_db'),
('hr_db_host', '127.0.0.1', 'hr_integration', 'HR Database Host'),
('hr_db_name', 'hr_solution_db', 'hr_integration', 'HR Database Name'),
('hr_db_user', 'root', 'hr_integration', 'HR Database User'),
('hr_db_pass', 'S@nds1@b', 'hr_integration', 'HR Database Password')
ON DUPLICATE KEY UPDATE `updated_at`=NOW();

-- 2. Shifts Table
CREATE TABLE IF NOT EXISTS `shifts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `shift_type` ENUM('Office', 'School Class', 'Flexible', 'Night') DEFAULT 'Office',
    `start_time` TIME NOT NULL,
    `end_time` TIME NOT NULL,
    `total_hours` DECIMAL(4,2) DEFAULT 8.00,
    `break_minutes` INT DEFAULT 60,
    `grace_late_in` INT DEFAULT 15,
    `grace_early_out` INT DEFAULT 15,
    `half_day_min_hours` DECIMAL(4,2) DEFAULT 4.00,
    `full_day_min_hours` DECIMAL(4,2) DEFAULT 7.00,
    `color_code` VARCHAR(20) DEFAULT '#3b82f6',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Default Shift matching standard office hours
INSERT INTO `shifts` (`code`, `name`, `shift_type`, `start_time`, `end_time`, `total_hours`, `break_minutes`, `grace_late_in`, `grace_early_out`, `half_day_min_hours`, `full_day_min_hours`, `color_code`) VALUES
('SH-OFFICE-01', 'Standard Office Shift', 'Office', '08:00:00', '17:00:00', 8.00, 60, 15, 15, 4.00, 7.00, '#2563eb'),
('SH-SCHOOL-01', 'Morning School Hours', 'School Class', '07:30:00', '14:00:00', 6.50, 45, 10, 10, 3.50, 6.00, '#ec4899')
ON DUPLICATE KEY UPDATE `updated_at`=NOW();

-- 3. Cameras Table (Supports Multiple Gates & In/Out Cameras)
CREATE TABLE IF NOT EXISTS `cameras` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `camera_name` VARCHAR(100) NOT NULL,
    `ip_address` VARCHAR(50) NOT NULL,
    `rtsp_url` VARCHAR(255) NOT NULL,
    `http_url` VARCHAR(255) NULL,
    `camera_role` ENUM('IN', 'OUT') NOT NULL DEFAULT 'IN',
    `gate_name` VARCHAR(100) NOT NULL DEFAULT 'Main Entrance',
    `door_location` VARCHAR(100) DEFAULT 'Reception',
    `status` ENUM('Online', 'Offline', 'Connecting') DEFAULT 'Offline',
    `last_ping` DATETIME NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed User's CCTV Camera (192.168.100.113) as Camera 1 (IN) and placeholder Camera 2 (OUT)
INSERT INTO `cameras` (`id`, `camera_name`, `ip_address`, `rtsp_url`, `camera_role`, `gate_name`, `door_location`, `status`) VALUES
(1, 'Main Entrance Camera (IN)', '192.168.100.113', 'rtsp://admin:admin123@192.168.100.113:554/live/ch0', 'IN', 'Main Gate', 'Reception Lobby', 'Online'),
(2, 'Main Exit Camera (OUT)', '192.168.100.114', 'rtsp://admin:admin123@192.168.100.114:554/live/ch0', 'OUT', 'Main Gate', 'Reception Lobby Exit', 'Offline')
ON DUPLICATE KEY UPDATE `ip_address`=VALUES(`ip_address`);

-- 4. Camera Pairs (Grouping IN & OUT for Door/Gate Gates)
CREATE TABLE IF NOT EXISTS `camera_pairs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `gate_name` VARCHAR(100) NOT NULL,
    `in_camera_id` INT NULL,
    `out_camera_id` INT NULL,
    `description` VARCHAR(255) NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`in_camera_id`) REFERENCES `cameras`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`out_camera_id`) REFERENCES `cameras`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `camera_pairs` (`id`, `gate_name`, `in_camera_id`, `out_camera_id`, `description`) VALUES
(1, 'Main Gate (Gate 1)', 1, 2, 'Main Reception In and Out Pair')
ON DUPLICATE KEY UPDATE `gate_name`=VALUES(`gate_name`);

-- 5. Users Table (Employees, Students, Staff with Face Embeddings)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_code` VARCHAR(50) NOT NULL UNIQUE,
    `full_name` VARCHAR(150) NOT NULL,
    `user_type` ENUM('Employee', 'Student', 'Visitor') DEFAULT 'Employee',
    `email` VARCHAR(150) NULL,
    `mobile` VARCHAR(50) NULL,
    `address` TEXT NULL,
    `cpr_no` VARCHAR(50) NULL,
    `department` VARCHAR(100) DEFAULT 'General',
    `designation` VARCHAR(100) DEFAULT 'Staff',
    `shift_id` INT NULL,
    `profile_photo` LONGTEXT NULL,
    `face_embedding` LONGTEXT NULL COMMENT '128-d or 512-d normalized float vector in JSON format',
    `status` ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    `hr_employee_id` INT NULL COMMENT 'Reference to hr_solution_db.employees.id',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL,
    INDEX `idx_user_code` (`user_code`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Sample User for Demo / Testing
INSERT INTO `users` (`id`, `user_code`, `full_name`, `user_type`, `email`, `mobile`, `address`, `cpr_no`, `department`, `designation`, `shift_id`, `status`) VALUES
(1, 'EMP-1001', 'Ahmed Al-Khalifa', 'Employee', 'ahmed@sandslab.me', '+973 33123456', 'Manama, Bahrain', '910203040', 'Engineering', 'Senior Developer', 1, 'Active'),
(2, 'EMP-1002', 'Fatima Al-Sayed', 'Employee', 'fatima@sandslab.me', '+973 39876543', 'Riffa, Bahrain', '950403020', 'Human Resources', 'HR Manager', 1, 'Active')
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

-- 6. Raw Attendance Logs (Every Punch Recorded from Any Camera)
CREATE TABLE IF NOT EXISTS `attendance_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `camera_id` INT NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `gate_name` VARCHAR(100) DEFAULT 'Main Gate',
    `punch_time` DATETIME NOT NULL,
    `punch_date` DATE NOT NULL,
    `confidence_score` DECIMAL(5,2) DEFAULT 0.00,
    `snapshot_path` VARCHAR(255) NULL,
    `verified_offline` TINYINT(1) DEFAULT 1,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`camera_id`) REFERENCES `cameras`(`id`) ON DELETE SET NULL,
    INDEX `idx_user_date` (`user_id`, `punch_date`),
    INDEX `idx_punch_time` (`punch_time`),
    INDEX `idx_direction` (`direction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Daily Attendance Summary (Aggregated First IN, Last OUT, Trips, Hours)
CREATE TABLE IF NOT EXISTS `daily_attendance_summary` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `attendance_date` DATE NOT NULL,
    `shift_id` INT NULL,
    `first_in` TIME NULL,
    `last_out` TIME NULL,
    `current_status` ENUM('INSIDE', 'OUTSIDE') DEFAULT 'OUTSIDE',
    `total_trips_out` INT DEFAULT 0 COMMENT 'Number of times person went out during the day',
    `total_inside_minutes` INT DEFAULT 0 COMMENT 'Total productive time spent inside',
    `total_outside_minutes` INT DEFAULT 0 COMMENT 'Total break/transit time spent outside',
    `total_hours` DECIMAL(4,2) DEFAULT 0.00,
    `late_in_mins` INT DEFAULT 0,
    `early_out_mins` INT DEFAULT 0,
    `status` ENUM('Present', 'Late', 'Half Day', 'Under Time', 'Absent', 'In Progress') DEFAULT 'Absent',
    `hr_synced` TINYINT(1) DEFAULT 0,
    `hr_synced_at` DATETIME NULL,
    `last_calculated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_user_date` (`user_id`, `attendance_date`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL,
    INDEX `idx_date_status` (`attendance_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. HR Synchronization Log Table
CREATE TABLE IF NOT EXISTS `hr_sync_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sync_type` ENUM('IMPORT_EMPLOYEES', 'EXPORT_ATTENDANCE') NOT NULL,
    `records_processed` INT DEFAULT 0,
    `records_affected` INT DEFAULT 0,
    `status` ENUM('Success', 'Partial', 'Failed') NOT NULL DEFAULT 'Success',
    `message` TEXT NULL,
    `synced_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

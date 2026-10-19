<?php
// database/migrate_v2.php
// Version 2.0 Database Migration: Blacklisted Persons & Guest Tracking

require_once __DIR__ . '/../backend/config/db.php';

try {
    $db = Database::getConnection();
    echo "Connected to MySQL successfully.\n";

    // 1. Create blacklisted_persons
    $sql1 = "
    CREATE TABLE IF NOT EXISTS `blacklisted_persons` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `person_code` VARCHAR(50) NOT NULL UNIQUE,
        `full_name` VARCHAR(150) NOT NULL,
        `threat_level` ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'High',
        `reason` TEXT NOT NULL,
        `photo_url` LONGTEXT NULL,
        `face_embedding` LONGTEXT NULL COMMENT '128-d normalized float vector in JSON format',
        `notes` TEXT NULL,
        `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_blk_code` (`person_code`),
        INDEX `idx_blk_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $db->exec($sql1);
    echo "✓ Table 'blacklisted_persons' ready.\n";

    // 2. Create blacklist_breach_logs
    $sql2 = "
    CREATE TABLE IF NOT EXISTS `blacklist_breach_logs` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `blacklisted_person_id` INT NOT NULL,
        `camera_id` INT NULL,
        `gate_name` VARCHAR(100) DEFAULT 'Main Gate',
        `direction` ENUM('IN', 'OUT') DEFAULT 'IN',
        `confidence_score` DECIMAL(5,2) DEFAULT 0.00,
        `snapshot_path` VARCHAR(255) NULL,
        `detected_at` DATETIME NOT NULL,
        `is_resolved` TINYINT(1) DEFAULT 0,
        `resolved_by` VARCHAR(100) NULL,
        `resolved_notes` TEXT NULL,
        `resolved_at` DATETIME NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`blacklisted_person_id`) REFERENCES `blacklisted_persons`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`camera_id`) REFERENCES `cameras`(`id`) ON DELETE SET NULL,
        INDEX `idx_breach_detected` (`detected_at`),
        INDEX `idx_breach_resolved` (`is_resolved`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $db->exec($sql2);
    echo "✓ Table 'blacklist_breach_logs' ready.\n";

    // 3. Create guests
    $sql3 = "
    CREATE TABLE IF NOT EXISTS `guests` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `guest_code` VARCHAR(50) NOT NULL UNIQUE,
        `guest_name` VARCHAR(150) NOT NULL DEFAULT 'Guest / Visitor',
        `guest_type` ENUM('Customer', 'Visitor', 'VIP', 'Contractor', 'Courier') DEFAULT 'Visitor',
        `company_name` VARCHAR(150) NULL,
        `phone` VARCHAR(50) NULL,
        `notes` TEXT NULL,
        `first_photo` LONGTEXT NULL,
        `latest_photo` LONGTEXT NULL,
        `face_embedding` LONGTEXT NULL COMMENT '128-d normalized float vector in JSON format',
        `total_visits` INT DEFAULT 1,
        `total_inside_minutes` INT DEFAULT 0,
        `current_status` ENUM('INSIDE', 'OUTSIDE') DEFAULT 'INSIDE',
        `first_seen_at` DATETIME NOT NULL,
        `last_seen_at` DATETIME NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_gst_code` (`guest_code`),
        INDEX `idx_gst_status` (`current_status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $db->exec($sql3);
    echo "✓ Table 'guests' ready.\n";

    // 4. Create guest_logs
    $sql4 = "
    CREATE TABLE IF NOT EXISTS `guest_logs` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `guest_id` INT NOT NULL,
        `camera_id` INT NULL,
        `direction` ENUM('IN', 'OUT') NOT NULL,
        `gate_name` VARCHAR(100) DEFAULT 'Main Gate',
        `punch_time` DATETIME NOT NULL,
        `punch_date` DATE NOT NULL,
        `duration_minutes` INT DEFAULT 0 COMMENT 'Duration spent inside if OUT punch',
        `confidence_score` DECIMAL(5,2) DEFAULT 0.00,
        `snapshot_path` VARCHAR(255) NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`camera_id`) REFERENCES `cameras`(`id`) ON DELETE SET NULL,
        INDEX `idx_gst_date` (`guest_id`, `punch_date`),
        INDEX `idx_gst_time` (`punch_time`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $db->exec($sql4);
    echo "✓ Table 'guest_logs' ready.\n";

    // Seed a demo blacklisted person for testing if empty
    $chk = $db->query("SELECT COUNT(*) FROM `blacklisted_persons`")->fetchColumn();
    if ($chk == 0) {
        $stmt = $db->prepare("
            INSERT INTO `blacklisted_persons` (`person_code`, `full_name`, `threat_level`, `reason`, `notes`, `status`)
            VALUES (:code, :name, :threat, :reason, :notes, 'Active')
        ");
        $stmt->execute([
            ':code' => 'BLK-001',
            ':name' => 'Restricted Individual (Demo)',
            ':threat' => 'High',
            ':reason' => 'Unauthorized entry attempt / Security warning',
            ':notes' => 'Do not allow facility entrance; notify security supervisor immediately.'
        ]);
        echo "✓ Seeded demo blacklisted record (BLK-001).\n";
    }

    echo "\nAll Version 2.0 database tables migrated successfully!\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

<?php
// database/migrate_v2_1.php
// Version 2.1.0 Database Migration: Camera Tamper & Anti-Spoofing Audit Table

require_once __DIR__ . '/../backend/config/db.php';

try {
    $db = Database::getConnection();
    echo "Connected to MySQL database.\n";

    $sql = "
    CREATE TABLE IF NOT EXISTS `tamper_logs` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NULL COMMENT 'User ID if recognized as an employee photo',
        `target_name` VARCHAR(150) DEFAULT 'Unknown / Unmatched',
        `target_code` VARCHAR(50) NULL,
        `camera_id` INT NULL,
        `gate_name` VARCHAR(100) DEFAULT 'Main Gate',
        `direction` ENUM('IN', 'OUT') DEFAULT 'IN',
        `event_type` VARCHAR(100) DEFAULT 'Photo / Screen Presentation Attack',
        `reason` VARCHAR(255) DEFAULT 'Anti-Spoofing Failure',
        `liveness_score` DECIMAL(5,2) DEFAULT 0.00,
        `confidence_score` DECIMAL(5,2) DEFAULT 0.00,
        `snapshot_path` VARCHAR(255) NOT NULL COMMENT 'Full whole-screen camera frame capture',
        `detected_at` DATETIME NOT NULL,
        `is_reviewed` TINYINT(1) DEFAULT 0,
        `reviewed_by` VARCHAR(100) NULL,
        `reviewed_notes` TEXT NULL,
        `reviewed_at` DATETIME NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`camera_id`) REFERENCES `cameras`(`id`) ON DELETE SET NULL,
        INDEX `idx_tamper_detected` (`detected_at`),
        INDEX `idx_tamper_reviewed` (`is_reviewed`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $db->exec($sql);
    echo "✓ Table 'tamper_logs' created successfully.\n";

    // Add full_snapshot_path to guest_logs if not exists
    $cols = $db->query("SHOW COLUMNS FROM `guest_logs` LIKE 'full_snapshot_path'")->fetchAll();
    if (empty($cols)) {
        $db->exec("ALTER TABLE `guest_logs` ADD COLUMN `full_snapshot_path` VARCHAR(255) NULL AFTER `snapshot_path`");
        echo "✓ Column 'full_snapshot_path' added to 'guest_logs'.\n";
    } else {
        echo "✓ Column 'full_snapshot_path' already exists in 'guest_logs'.\n";
    }

    // Add first_full_photo and latest_full_photo to guests if not exists
    $colsG1 = $db->query("SHOW COLUMNS FROM `guests` LIKE 'first_full_photo'")->fetchAll();
    if (empty($colsG1)) {
        $db->exec("ALTER TABLE `guests` ADD COLUMN `first_full_photo` LONGTEXT NULL AFTER `first_photo`");
        echo "✓ Column 'first_full_photo' added to 'guests'.\n";
    } else {
        echo "✓ Column 'first_full_photo' already exists in 'guests'.\n";
    }

    $colsG2 = $db->query("SHOW COLUMNS FROM `guests` LIKE 'latest_full_photo'")->fetchAll();
    if (empty($colsG2)) {
        $db->exec("ALTER TABLE `guests` ADD COLUMN `latest_full_photo` LONGTEXT NULL AFTER `latest_photo`");
        echo "✓ Column 'latest_full_photo' added to 'guests'.\n";
    } else {
        echo "✓ Column 'latest_full_photo' already exists in 'guests'.\n";
    }

    // Add is_archived and archived_at to guests for Archive Vault
    $colsG3 = $db->query("SHOW COLUMNS FROM `guests` LIKE 'is_archived'")->fetchAll();
    if (empty($colsG3)) {
        $db->exec("ALTER TABLE `guests` ADD COLUMN `is_archived` TINYINT(1) DEFAULT 0 AFTER `current_status`, ADD INDEX `idx_gst_archived` (`is_archived`)");
        echo "✓ Column 'is_archived' added to 'guests'.\n";
    } else {
        echo "✓ Column 'is_archived' already exists in 'guests'.\n";
    }

    $colsG4 = $db->query("SHOW COLUMNS FROM `guests` LIKE 'archived_at'")->fetchAll();
    if (empty($colsG4)) {
        $db->exec("ALTER TABLE `guests` ADD COLUMN `archived_at` DATETIME NULL AFTER `is_archived`");
    } else {
        echo "✓ Column 'archived_at' already exists in 'guests'.\n";
    }

    // Add is_archived and archived_at to tamper_logs
    $colsT1 = $db->query("SHOW COLUMNS FROM `tamper_logs` LIKE 'is_archived'")->fetchAll();
    if (empty($colsT1)) {
        $db->exec("ALTER TABLE `tamper_logs` ADD COLUMN `is_archived` TINYINT(1) DEFAULT 0 AFTER `is_reviewed`, ADD INDEX `idx_tamper_archived` (`is_archived`)");
        echo "✓ Column 'is_archived' added to 'tamper_logs'.\n";
    } else {
        echo "✓ Column 'is_archived' already exists in 'tamper_logs'.\n";
    }

    $colsT2 = $db->query("SHOW COLUMNS FROM `tamper_logs` LIKE 'archived_at'")->fetchAll();
    if (empty($colsT2)) {
        $db->exec("ALTER TABLE `tamper_logs` ADD COLUMN `archived_at` DATETIME NULL AFTER `is_archived`");
        echo "✓ Column 'archived_at' added to 'tamper_logs'.\n";
    } else {
        echo "✓ Column 'archived_at' already exists in 'tamper_logs'.\n";
    }

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

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

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

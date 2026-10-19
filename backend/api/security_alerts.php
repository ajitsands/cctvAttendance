<?php
// backend/api/security_alerts.php
// Version 2.0 Real-Time Security Alert Stream API for Blacklist Breaches

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();

$lastId = isset($_GET['last_id']) ? (int)$_GET['last_id'] : 0;

$sql = "
    SELECT 
        b.id, b.blacklisted_person_id, b.camera_id, b.gate_name, b.direction,
        b.confidence_score, b.snapshot_path, b.detected_at, b.is_resolved,
        p.person_code, p.full_name, p.threat_level, p.reason, p.photo_url as reference_photo, p.notes as handling_notes,
        c.camera_name
    FROM blacklist_breach_logs b
    JOIN blacklisted_persons p ON b.blacklisted_person_id = p.id
    LEFT JOIN cameras c ON b.camera_id = c.id
    WHERE b.id > :last_id
    ORDER BY b.id DESC
    LIMIT 10
";

$stmt = $db->prepare($sql);
$stmt->execute([':last_id' => $lastId]);
$newBreaches = $stmt->fetchAll();

// Count unresolved
$unresolvedTotal = (int)$db->query("SELECT COUNT(*) FROM blacklist_breach_logs WHERE is_resolved = 0")->fetchColumn();

jsonResponse([
    'new_breaches' => $newBreaches,
    'has_new' => count($newBreaches) > 0,
    'latest_id' => count($newBreaches) > 0 ? (int)$newBreaches[0]['id'] : $lastId,
    'unresolved_count' => $unresolvedTotal
]);

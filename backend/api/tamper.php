<?php
// backend/api/tamper.php
// Version 2.1.0 Camera Tamper & Anti-Spoofing Audit API

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // 1. Polling for real-time security alerts
    if (($_GET['action'] ?? '') === 'poll_tamper') {
        $sinceId = isset($_GET['since_id']) ? (int)$_GET['since_id'] : 0;
        
        $latestId = (int)$db->query("SELECT IFNULL(MAX(id), 0) FROM tamper_logs")->fetchColumn();
        $hasNew = $latestId > $sinceId;
        $newTampers = [];

        if ($hasNew && $sinceId > 0) {
            $stmt = $db->prepare("
                SELECT t.*, u.profile_photo, u.department, c.camera_name
                FROM tamper_logs t
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN cameras c ON t.camera_id = c.id
                WHERE t.id > ?
                ORDER BY t.id DESC
                LIMIT 5
            ");
            $stmt->execute([$sinceId]);
            $newTampers = $stmt->fetchAll();
        }

        jsonResponse([
            'has_new' => $hasNew,
            'latest_id' => $latestId,
            'new_tampers' => $newTampers
        ]);
    }

    // 2. Fetch tamper logs & summary stats
    $statusFilter = $_GET['status'] ?? 'all'; // 'unreviewed', 'reviewed', 'archived', 'all'
    $dateFilter = $_GET['date'] ?? '';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;

    $sql = "
        SELECT t.*, u.profile_photo, u.department, u.email, c.camera_name
        FROM tamper_logs t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN cameras c ON t.camera_id = c.id
        WHERE 1=1
    ";

    $params = [];
    if ($statusFilter === 'unreviewed') {
        $sql .= " AND t.is_reviewed = 0 AND COALESCE(t.is_archived, 0) = 0";
    } elseif ($statusFilter === 'reviewed') {
        $sql .= " AND t.is_reviewed = 1 AND COALESCE(t.is_archived, 0) = 0";
    } elseif ($statusFilter === 'archived') {
        $sql .= " AND COALESCE(t.is_archived, 0) = 1";
    } else {
        // Default 'all' shows all active unarchived incidents
        $sql .= " AND COALESCE(t.is_archived, 0) = 0";
    }

    if (!empty($dateFilter)) {
        $sql .= " AND DATE(t.detected_at) = ?";
        $params[] = $dateFilter;
    }

    $sql .= " ORDER BY t.detected_at DESC LIMIT " . $limit;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll();

    // Summary stats
    $totalCount = (int)$db->query("SELECT COUNT(*) FROM tamper_logs WHERE COALESCE(is_archived, 0) = 0")->fetchColumn();
    $unreviewedCount = (int)$db->query("SELECT COUNT(*) FROM tamper_logs WHERE is_reviewed = 0 AND COALESCE(is_archived, 0) = 0")->fetchColumn();
    $reviewedCount = (int)$db->query("SELECT COUNT(*) FROM tamper_logs WHERE is_reviewed = 1 AND COALESCE(is_archived, 0) = 0")->fetchColumn();
    $archivedCount = (int)$db->query("SELECT COUNT(*) FROM tamper_logs WHERE COALESCE(is_archived, 0) = 1")->fetchColumn();
    $todayCount = (int)$db->query("SELECT COUNT(*) FROM tamper_logs WHERE DATE(detected_at) = CURDATE() AND COALESCE(is_archived, 0) = 0")->fetchColumn();

    jsonResponse([
        'stats' => [
            'total_tamper_count' => $totalCount,
            'today_tamper_count' => $todayCount,
            'unreviewed_count' => $unreviewedCount,
            'reviewed_count' => $reviewedCount,
            'archived_count' => $archivedCount
        ],
        'logs' => $logs
    ]);

} elseif ($method === 'POST') {
    $action = $_GET['action'] ?? '';
    $input = json_decode(file_get_contents('php://input'), true);

    // ACTION: Log a Tamper / Anti-Spoofing Incident from AI Camera Worker
    if ($action === 'log_tamper') {
        $userId = !empty($input['user_id']) ? (int)$input['user_id'] : null;
        $targetName = $input['target_name'] ?? 'Unknown / Unmatched';
        $targetCode = $input['target_code'] ?? null;
        $cameraId = !empty($input['camera_id']) ? (int)$input['camera_id'] : null;
        $gateName = $input['gate_name'] ?? 'Main Gate';
        $direction = in_array(strtoupper($input['direction'] ?? 'IN'), ['IN', 'OUT']) ? strtoupper($input['direction']) : 'IN';
        $eventType = $input['event_type'] ?? 'Photo / Screen Presentation Attack';
        $reason = $input['reason'] ?? 'Anti-Spoofing Failure';
        $livenessScore = isset($input['liveness_score']) ? (float)$input['liveness_score'] : 0.0;
        $confidenceScore = isset($input['confidence_score']) ? (float)$input['confidence_score'] : 0.0;
        $detectedAt = $input['detected_at'] ?? date('Y-m-d H:i:s');

        // Handle full-frame camera screen capture snapshot
        $snapshotPath = null;
        if (!empty($input['snapshot'])) {
            $base64Data = $input['snapshot'];
            if (strpos($base64Data, ',') !== false) {
                $base64Data = explode(',', $base64Data)[1];
            }
            $imgBinary = base64_decode($base64Data);
            if ($imgBinary !== false) {
                $dirBackend = __DIR__ . '/../uploads/tamper';
                $dirFrontend = __DIR__ . '/../../frontend/public/uploads/tamper';
                if (!is_dir($dirBackend)) { @mkdir($dirBackend, 0777, true); }
                if (!is_dir($dirFrontend)) { @mkdir($dirFrontend, 0777, true); }

                $filename = 'tamper_' . time() . '_' . rand(100, 999) . '.jpg';
                file_put_contents($dirBackend . '/' . $filename, $imgBinary);
                @file_put_contents($dirFrontend . '/' . $filename, $imgBinary);
                $snapshotPath = '/uploads/tamper/' . $filename;
            }
        }

        $stmt = $db->prepare("
            INSERT INTO tamper_logs 
            (user_id, target_name, target_code, camera_id, gate_name, direction, event_type, reason, liveness_score, confidence_score, snapshot_path, detected_at, is_reviewed, is_archived)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
        ");
        $stmt->execute([
            $userId,
            $targetName,
            $targetCode,
            $cameraId,
            $gateName,
            $direction,
            $eventType,
            $reason,
            $livenessScore,
            $confidenceScore,
            $snapshotPath ?: '',
            $detectedAt
        ]);

        $insertedId = (int)$db->lastInsertId();
        jsonResponse([
            'id' => $insertedId,
            'snapshot_path' => $snapshotPath,
            'message' => 'Tamper attempt logged successfully with full camera screen capture.'
        ], 201);

    } elseif ($action === 'review') {
        // ACTION: Mark Tamper incident as reviewed (with optional archive)
        $id = (int)($input['id'] ?? 0);
        $notes = trim($input['notes'] ?? 'Acknowledged by security administrator.');
        $reviewedBy = trim($input['reviewed_by'] ?? 'Security Admin');
        $archiveAlso = !empty($input['archive_also']);

        if ($id <= 0) {
            jsonError('Invalid tamper log ID', 400);
        }

        if ($archiveAlso) {
            $stmt = $db->prepare("
                UPDATE tamper_logs 
                SET is_reviewed = 1, reviewed_by = ?, reviewed_notes = ?, reviewed_at = NOW(), is_archived = 1, archived_at = NOW()
                WHERE id = ?
            ");
        } else {
            $stmt = $db->prepare("
                UPDATE tamper_logs 
                SET is_reviewed = 1, reviewed_by = ?, reviewed_notes = ?, reviewed_at = NOW()
                WHERE id = ?
            ");
        }
        $stmt->execute([$reviewedBy, $notes, $id]);

        jsonResponse([
            'success' => true, 
            'id' => $id, 
            'archived' => $archiveAlso,
            'message' => $archiveAlso ? 'Incident reviewed and archived' : 'Incident marked as reviewed'
        ]);

    } elseif ($action === 'archive') {
        // ACTION: Move Tamper incident(s) to Archive Vault
        $ids = !empty($input['ids']) ? $input['ids'] : (!empty($input['id']) ? [(int)$input['id']] : []);
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));

        if (empty($ids)) {
            jsonError('No tamper log ID(s) provided', 400);
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $db->prepare("UPDATE tamper_logs SET is_archived = 1, archived_at = NOW() WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        $count = $stmt->rowCount();

        jsonResponse([
            'success' => true,
            'archived_count' => $count,
            'message' => "Successfully archived {$count} tamper incident(s)."
        ]);

    } elseif ($action === 'restore' || $action === 'unarchive') {
        // ACTION: Restore Tamper incident(s) from Archive back to Active
        $ids = !empty($input['ids']) ? $input['ids'] : (!empty($input['id']) ? [(int)$input['id']] : []);
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));

        if (empty($ids)) {
            jsonError('No tamper log ID(s) provided', 400);
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $db->prepare("UPDATE tamper_logs SET is_archived = 0, archived_at = NULL WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        $count = $stmt->rowCount();

        jsonResponse([
            'success' => true,
            'restored_count' => $count,
            'message' => "Successfully restored {$count} tamper incident(s) back to active logs."
        ]);

    } elseif ($action === 'delete') {
        // ACTION: Permanently delete Tamper incident(s)
        $ids = !empty($input['ids']) ? $input['ids'] : (!empty($input['id']) ? [(int)$input['id']] : []);
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));

        if (empty($ids)) {
            jsonError('No tamper log ID(s) provided', 400);
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        // Clean up physical snapshot files if any
        $findStmt = $db->prepare("SELECT snapshot_path FROM tamper_logs WHERE id IN ($placeholders)");
        $findStmt->execute($ids);
        $snapshots = $findStmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($snapshots as $snap) {
            if (!empty($snap)) {
                $cleanSnap = ltrim($snap, '/');
                @unlink(__DIR__ . '/../' . $cleanSnap);
                @unlink(__DIR__ . '/../../frontend/public/' . $cleanSnap);
            }
        }

        $stmt = $db->prepare("DELETE FROM tamper_logs WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        $count = $stmt->rowCount();

        jsonResponse([
            'success' => true,
            'deleted_count' => $count,
            'message' => "Permanently deleted {$count} tamper incident log(s)."
        ]);

    } else {
        jsonError('Invalid action', 400);
    }
} else {
    jsonError('Method not allowed', 405);
}

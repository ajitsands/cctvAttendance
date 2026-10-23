<?php
// backend/api/attendance.php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/calc.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? ($method === 'POST' ? 'punch' : 'summary');

if ($action === 'punch' && $method === 'POST') {
    $input = getJsonInput();

    $userId = $input['user_id'] ?? null;
    $userCode = $input['user_code'] ?? null;
    $cameraId = $input['camera_id'] ?? null;
    $direction = strtoupper($input['direction'] ?? 'IN');
    $confidence = (float)($input['confidence_score'] ?? 0.0);
    $snapshot = $input['snapshot'] ?? null;
    $gateName = $input['gate_name'] ?? 'Main Gate';
    $customTime = $input['punch_time'] ?? date('Y-m-d H:i:s');
    $punchDate = date('Y-m-d', strtotime($customTime));

    if (!in_array($direction, ['IN', 'OUT'])) {
        jsonError("Direction must be 'IN' or 'OUT'");
    }

    // Resolve user by ID or user_code
    if (!$userId && $userCode) {
        $stmtU = $db->prepare("SELECT id FROM users WHERE user_code = ? AND status = 'Active' LIMIT 1");
        $stmtU->execute([$userCode]);
        $userId = $stmtU->fetchColumn();
    }

    if (!$userId) {
        jsonError('Valid active User ID or User Code is required');
    }

    // Resolve camera details
    if ($cameraId) {
        $stmtCam = $db->prepare("SELECT camera_role, gate_name FROM cameras WHERE id = ? LIMIT 1");
        $stmtCam->execute([$cameraId]);
        $cam = $stmtCam->fetch();
        if ($cam) {
            $direction = $cam['camera_role']; // Camera role overrides direction
            $gateName = $cam['gate_name'];
        }
    }

    // 1. Anti-spam debounce check (prevent double logging within cooldown window)
    $stmtCool = $db->query("SELECT setting_value FROM system_settings WHERE setting_key = 'punch_cooldown_seconds' LIMIT 1");
    $cooldownSec = (int)($stmtCool->fetchColumn() ?: 60);

    $stmtCheck = $db->prepare("
        SELECT id, punch_time, direction 
        FROM attendance_logs 
        WHERE user_id = ? AND direction = ? AND punch_date = ? 
        ORDER BY punch_time DESC LIMIT 1
    ");
    $stmtCheck->execute([$userId, $direction, $punchDate]);
    $lastPunch = $stmtCheck->fetch();

    if ($lastPunch) {
        $secondsSince = strtotime($customTime) - strtotime($lastPunch['punch_time']);
        if ($secondsSince < $cooldownSec && $secondsSince >= 0) {
            // Already logged recently, return current summary with user data for live notification
            $existingSummary = AttendanceCalculator::calculateUserDay($userId, $punchDate);
            $stmtInfo = $db->prepare("SELECT id, user_code, full_name, user_type, department, designation, profile_photo FROM users WHERE id = ?");
            $stmtInfo->execute([$userId]);
            $userInfo = $stmtInfo->fetch();
            jsonResponse([
                'debounced' => true,
                'message' => "Punch debounced ($secondsSince s ago). Attendance already registered.",
                'direction' => $direction,
                'gate_name' => $gateName,
                'punch_time' => $customTime,
                'confidence' => $confidence,
                'user' => $userInfo,
                'summary' => $existingSummary
            ]);
        }
    }

    // Save snapshot image if base64 provided
    $snapshotPath = null;
    if ($snapshot && strpos($snapshot, 'data:image') === 0) {
        $dir = __DIR__ . '/../../uploads/snapshots/' . date('Ymd') . '/';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        $parts = explode(',', $snapshot);
        $data = base64_decode($parts[1] ?? '');
        if ($data) {
            $filename = 'snap_' . $userId . '_' . time() . '.jpg';
            file_put_contents($dir . $filename, $data);
            $snapshotPath = '/uploads/snapshots/' . date('Ymd') . '/' . $filename;
        }
    }

    // 2. Insert new punch event
    $stmtInsert = $db->prepare("
        INSERT INTO attendance_logs 
        (user_id, camera_id, direction, gate_name, punch_time, punch_date, confidence_score, snapshot_path, verified_offline)
        VALUES 
        (:user_id, :camera_id, :direction, :gate_name, :punch_time, :punch_date, :confidence_score, :snapshot_path, 1)
    ");
    $stmtInsert->execute([
        ':user_id' => $userId,
        ':camera_id' => $cameraId,
        ':direction' => $direction,
        ':gate_name' => $gateName,
        ':punch_time' => $customTime,
        ':punch_date' => $punchDate,
        ':confidence_score' => $confidence,
        ':snapshot_path' => $snapshotPath
    ]);
    $logId = $db->lastInsertId();

    // 3. Recalculate daily summary instantly
    $summary = AttendanceCalculator::calculateUserDay($userId, $punchDate);

    // Fetch user details for instant live notification card
    $stmtInfo = $db->prepare("SELECT id, user_code, full_name, user_type, department, designation, profile_photo FROM users WHERE id = ?");
    $stmtInfo->execute([$userId]);
    $userInfo = $stmtInfo->fetch();

    jsonResponse([
        'log_id' => $logId,
        'direction' => $direction,
        'gate_name' => $gateName,
        'punch_time' => $customTime,
        'confidence' => $confidence,
        'user' => $userInfo,
        'summary' => $summary
    ], 201, 'Punch logged and attendance updated successfully');

} elseif ($action === 'summary' && $method === 'GET') {
    $date = !empty($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    $dept = $_GET['department'] ?? '';
    $status = $_GET['status'] ?? '';
    $search = $_GET['search'] ?? '';

    // First ensure every active user has an entry calculated for today
    $activeUsers = $db->query("SELECT id FROM users WHERE status = 'Active'")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($activeUsers as $uId) {
        AttendanceCalculator::calculateUserDay($uId, $date);
    }

    $sql = "
        SELECT 
            s.*,
            u.user_code, u.full_name, u.user_type, u.department, u.designation, u.profile_photo, u.mobile,
            sh.name as shift_name, sh.start_time as shift_start, sh.end_time as shift_end
        FROM users u
        LEFT JOIN daily_attendance_summary s ON u.id = s.user_id AND s.attendance_date = :att_date
        LEFT JOIN shifts sh ON u.shift_id = sh.id
        WHERE u.status = 'Active'
    ";
    $params = [':att_date' => $date];

    if (!empty($dept)) {
        $sql .= " AND u.department = :dept";
        $params[':dept'] = $dept;
    }
    if (!empty($status)) {
        $sql .= " AND s.status = :status";
        $params[':status'] = $status;
    }
    if (!empty($search)) {
        $sql .= " AND (u.full_name LIKE :search OR u.user_code LIKE :search OR u.mobile LIKE :search)";
        $params[':search'] = "%$search%";
    }

    $sql .= " ORDER BY u.full_name ASC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $records = $stmt->fetchAll();

    jsonResponse([
        'date' => $date,
        'total_count' => count($records),
        'records' => $records
    ]);

} elseif ($action === 'user_timeline' && $method === 'GET') {
    $userId = $_GET['user_id'] ?? null;
    $date = !empty($_GET['date']) ? $_GET['date'] : date('Y-m-d');

    if (!$userId) {
        jsonError('User ID required');
    }

    $stmt = $db->prepare("
        SELECT l.*, c.camera_name, c.ip_address
        FROM attendance_logs l
        LEFT JOIN cameras c ON l.camera_id = c.id
        WHERE l.user_id = ? AND l.punch_date = ?
        ORDER BY l.punch_time ASC
    ");
    $stmt->execute([$userId, $date]);
    $timeline = $stmt->fetchAll();

    // Fetch user and summary
    $stmtU = $db->prepare("SELECT id, user_code, full_name, department, designation, profile_photo FROM users WHERE id = ?");
    $stmtU->execute([$userId]);
    $user = $stmtU->fetch();

    $stmtS = $db->prepare("SELECT * FROM daily_attendance_summary WHERE user_id = ? AND attendance_date = ?");
    $stmtS->execute([$userId, $date]);
    $summary = $stmtS->fetch();

    jsonResponse([
        'user' => $user,
        'date' => $date,
        'summary' => $summary,
        'logs' => $timeline
    ]);

} elseif ($action === 'dashboard_stats' && $method === 'GET') {
    $date = !empty($_GET['date']) ? $_GET['date'] : date('Y-m-d');

    // Total Users
    $totalUsers = (int)$db->query("SELECT COUNT(*) FROM users WHERE status = 'Active'")->fetchColumn();

    // Summary stats for date
    $stmtStats = $db->prepare("
        SELECT 
            SUM(CASE WHEN status IN ('Present', 'Late', 'Half Day') THEN 1 ELSE 0 END) as present_count,
            SUM(CASE WHEN current_status = 'INSIDE' THEN 1 ELSE 0 END) as currently_inside,
            SUM(CASE WHEN current_status = 'OUTSIDE' AND first_in IS NOT NULL THEN 1 ELSE 0 END) as out_on_break,
            SUM(CASE WHEN late_in_mins > 0 THEN 1 ELSE 0 END) as late_count,
            SUM(CASE WHEN status = 'Absent' OR status IS NULL THEN 1 ELSE 0 END) as absent_count
        FROM daily_attendance_summary
        WHERE attendance_date = ?
    ");
    $stmtStats->execute([$date]);
    $stats = $stmtStats->fetch() ?: [];

    // Active cameras
    $totalCameras = (int)$db->query("SELECT COUNT(*) FROM cameras WHERE is_active = 1")->fetchColumn();
    $onlineCameras = (int)$db->query("SELECT COUNT(*) FROM cameras WHERE is_active = 1 AND status = 'Online'")->fetchColumn();

    // Recent 10 live punches for Employees / Staff only
    $stmtRecent = $db->query("
        SELECT l.*, u.full_name, u.user_code, u.profile_photo, u.department, c.camera_name, 'EMPLOYEE' as person_type
        FROM attendance_logs l
        JOIN users u ON l.user_id = u.id
        LEFT JOIN cameras c ON l.camera_id = c.id
        ORDER BY l.id DESC
        LIMIT 10
    ");
    $recentPunches = $stmtRecent ? ($stmtRecent->fetchAll() ?: []) : [];

    jsonResponse([
        'date' => $date,
        'total_users' => $totalUsers,
        'present_count' => (int)($stats['present_count'] ?? 0),
        'currently_inside' => (int)($stats['currently_inside'] ?? 0),
        'out_on_break' => (int)($stats['out_on_break'] ?? 0),
        'late_count' => (int)($stats['late_count'] ?? 0),
        'absent_count' => max(0, $totalUsers - (int)($stats['present_count'] ?? 0)),
        'total_cameras' => $totalCameras,
        'online_cameras' => $onlineCameras,
        'recent_punches' => $recentPunches
    ]);

} elseif ($action === 'recalculate' && $method === 'POST') {
    $date = $_GET['date'] ?? date('Y-m-d');
    $activeUsers = $db->query("SELECT id FROM users WHERE status = 'Active'")->fetchAll(PDO::FETCH_COLUMN);
    $count = 0;
    foreach ($activeUsers as $uId) {
        AttendanceCalculator::calculateUserDay($uId, $date);
        $count++;
    }
    jsonResponse(['recalculated_count' => $count, 'date' => $date], 200, "Recalculated summaries for $count users");

} else {
    jsonError('Invalid action', 400);
}

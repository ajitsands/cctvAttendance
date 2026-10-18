<?php
// backend/api/reports.php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();

$startDate = $_GET['start_date'] ?? date('Y-m-01');
$endDate   = $_GET['end_date'] ?? date('Y-m-d');
$userId    = $_GET['user_id'] ?? null;
$dept      = $_GET['department'] ?? '';
$status    = $_GET['status'] ?? '';

$sql = "
    SELECT 
        s.*,
        u.user_code, u.full_name, u.user_type, u.department, u.designation, u.profile_photo,
        sh.name as shift_name, sh.start_time as shift_start, sh.end_time as shift_end
    FROM daily_attendance_summary s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN shifts sh ON s.shift_id = sh.id
    WHERE s.attendance_date BETWEEN :start_date AND :end_date
";
$params = [
    ':start_date' => $startDate,
    ':end_date' => $endDate
];

if (!empty($userId)) {
    $sql .= " AND s.user_id = :user_id";
    $params[':user_id'] = $userId;
}
if (!empty($dept)) {
    $sql .= " AND u.department = :dept";
    $params[':dept'] = $dept;
}
if (!empty($status)) {
    $sql .= " AND s.status = :status";
    $params[':status'] = $status;
}

$sql .= " ORDER BY s.attendance_date DESC, u.full_name ASC";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

// Calculate Aggregates
$totalRecords = count($rows);
$totalHoursSum = 0;
$totalTripsSum = 0;
$presentDays = 0;
$lateDays = 0;
$halfDays = 0;
$absentDays = 0;

foreach ($rows as $r) {
    $totalHoursSum += (float)$r['total_hours'];
    $totalTripsSum += (int)$r['total_trips_out'];
    if ($r['status'] === 'Present') $presentDays++;
    elseif ($r['status'] === 'Late') $lateDays++;
    elseif ($r['status'] === 'Half Day') $halfDays++;
    elseif ($r['status'] === 'Absent') $absentDays++;
}

jsonResponse([
    'filter' => [
        'start_date' => $startDate,
        'end_date' => $endDate,
        'department' => $dept,
        'user_id' => $userId
    ],
    'totals' => [
        'records' => $totalRecords,
        'total_hours' => round($totalHoursSum, 2),
        'total_trips_out' => $totalTripsSum,
        'present_days' => $presentDays,
        'late_days' => $lateDays,
        'half_days' => $halfDays,
        'absent_days' => $absentDays
    ],
    'rows' => $rows
]);

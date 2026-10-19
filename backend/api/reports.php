<?php
// backend/api/reports.php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();

$startDate = $_GET['start_date'] ?? date('Y-m-01');
$endDate   = $_GET['end_date'] ?? date('Y-m-d');
$userId    = !empty($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$dept      = $_GET['department'] ?? '';
$status    = $_GET['status'] ?? '';

// 1. Fetch daily records
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

// 2. Fetch all users matching the filter so that employees with 0 attendance also appear if requested
$userSql = "SELECT id, user_code, full_name, user_type, department, designation, profile_photo FROM users WHERE status = 'Active'";
$userParams = [];
if (!empty($userId)) {
    $userSql .= " AND id = :user_id";
    $userParams[':user_id'] = $userId;
}
if (!empty($dept)) {
    $userSql .= " AND department = :dept";
    $userParams[':dept'] = $dept;
}
$userSql .= " ORDER BY full_name ASC";
$userStmt = $db->prepare($userSql);
$userStmt->execute($userParams);
$allFilteredUsers = $userStmt->fetchAll();

// 3. Build Employee Rollup Summaries
$empMap = [];
foreach ($allFilteredUsers as $u) {
    $empMap[$u['id']] = [
        'user_id' => (int)$u['id'],
        'user_code' => $u['user_code'],
        'full_name' => $u['full_name'],
        'user_type' => $u['user_type'],
        'department' => $u['department'] ?? 'General',
        'designation' => $u['designation'] ?? 'Staff',
        'profile_photo' => $u['profile_photo'],
        'total_inside_minutes' => 0,
        'total_outside_minutes' => 0,
        'total_in_hours' => 0.0,
        'total_out_hours' => 0.0,
        'total_out_events' => 0,
        'avg_out_minutes' => 0,
        'total_days_late' => 0,
        'total_late_minutes' => 0,
        'total_days_early' => 0,
        'total_early_minutes' => 0,
        'days_present' => 0,
        'days_absent' => 0,
        'days_half_day' => 0,
        'days_total' => 0,
        'attendance_rate' => 0.0
    ];
}

$presentDays = 0;
$lateDays = 0;
$halfDays = 0;
$absentDays = 0;

foreach ($rows as $r) {
    $uid = (int)$r['user_id'];
    if (!isset($empMap[$uid])) {
        $empMap[$uid] = [
            'user_id' => $uid,
            'user_code' => $r['user_code'],
            'full_name' => $r['full_name'],
            'user_type' => $r['user_type'],
            'department' => $r['department'] ?? 'General',
            'designation' => $r['designation'] ?? 'Staff',
            'profile_photo' => $r['profile_photo'],
            'total_inside_minutes' => 0,
            'total_outside_minutes' => 0,
            'total_in_hours' => 0.0,
            'total_out_hours' => 0.0,
            'total_out_events' => 0,
            'avg_out_minutes' => 0,
            'total_days_late' => 0,
            'total_late_minutes' => 0,
            'total_days_early' => 0,
            'total_early_minutes' => 0,
            'days_present' => 0,
            'days_absent' => 0,
            'days_half_day' => 0,
            'days_total' => 0,
            'attendance_rate' => 0.0
        ];
    }

    $empMap[$uid]['days_total']++;
    $insideMins = (int)($r['total_inside_minutes'] ?? 0);
    if ($insideMins === 0 && !empty($r['total_hours'])) {
        $insideMins = (int)round((float)$r['total_hours'] * 60);
    }
    $outsideMins = (int)($r['total_outside_minutes'] ?? 0);
    $tripsOut = (int)($r['total_trips_out'] ?? 0);
    $lateMins = (int)($r['late_in_mins'] ?? 0);
    $earlyMins = (int)($r['early_out_mins'] ?? 0);

    $empMap[$uid]['total_inside_minutes'] += $insideMins;
    $empMap[$uid]['total_outside_minutes'] += $outsideMins;
    $empMap[$uid]['total_out_events'] += $tripsOut;

    if ($lateMins > 0) {
        $empMap[$uid]['total_days_late']++;
        $empMap[$uid]['total_late_minutes'] += $lateMins;
    }
    if ($earlyMins > 0) {
        $empMap[$uid]['total_days_early']++;
        $empMap[$uid]['total_early_minutes'] += $earlyMins;
    }

    if (in_array($r['status'], ['Present', 'Late', 'Half Day', 'Under Time']) && !empty($r['first_in'])) {
        $empMap[$uid]['days_present']++;
    } elseif ($r['status'] === 'Absent') {
        $empMap[$uid]['days_absent']++;
    }

    if ($r['status'] === 'Half Day') {
        $empMap[$uid]['days_half_day']++;
    }

    // Global counters
    if ($r['status'] === 'Present') $presentDays++;
    elseif ($r['status'] === 'Late') $lateDays++;
    elseif ($r['status'] === 'Half Day') $halfDays++;
    elseif ($r['status'] === 'Absent') $absentDays++;
}

// Format final employee calculations
foreach ($empMap as $uid => &$emp) {
    $emp['total_in_hours'] = round($emp['total_inside_minutes'] / 60, 2);
    $emp['total_out_hours'] = round($emp['total_outside_minutes'] / 60, 2);
    $emp['avg_out_minutes'] = $emp['total_out_events'] > 0 
        ? (int)round($emp['total_outside_minutes'] / $emp['total_out_events']) 
        : 0;
    $emp['attendance_rate'] = $emp['days_total'] > 0 
        ? round(($emp['days_present'] / $emp['days_total']) * 100, 1) 
        : 0.0;
}
unset($emp);

$employeeSummaries = array_values($empMap);

// Global Aggregates
$totalRecords = count($rows);
$totalInHoursSum = round(array_sum(array_column($employeeSummaries, 'total_in_hours')), 2);
$totalOutHoursSum = round(array_sum(array_column($employeeSummaries, 'total_out_hours')), 2);
$totalTripsSum = array_sum(array_column($employeeSummaries, 'total_out_events'));
$totalLateDaysSum = array_sum(array_column($employeeSummaries, 'total_days_late'));
$totalEarlyDaysSum = array_sum(array_column($employeeSummaries, 'total_days_early'));
$totalOutMinsSum = array_sum(array_column($employeeSummaries, 'total_outside_minutes'));
$avgOutMinsCompany = $totalTripsSum > 0 ? (int)round($totalOutMinsSum / $totalTripsSum) : 0;

jsonResponse([
    'filter' => [
        'start_date' => $startDate,
        'end_date' => $endDate,
        'department' => $dept,
        'user_id' => $userId,
        'status' => $status
    ],
    'totals' => [
        'total_employees' => count($employeeSummaries),
        'records' => $totalRecords,
        'total_in_hours' => $totalInHoursSum,
        'total_out_hours' => $totalOutHoursSum,
        'total_out_events' => $totalTripsSum,
        'avg_out_minutes' => $avgOutMinsCompany,
        'total_days_late' => $totalLateDaysSum,
        'total_days_early' => $totalEarlyDaysSum,
        'present_days' => $presentDays,
        'late_days' => $lateDays,
        'half_days' => $halfDays,
        'absent_days' => $absentDays
    ],
    'employee_summaries' => $employeeSummaries,
    'rows' => $rows
]);

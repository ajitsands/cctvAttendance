<?php
// backend/api/reports.php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();

// ACTION: Monthly Attendance Matrix Report (1 to 31 Days Grid)
if (($_GET['action'] ?? '') === 'monthly_matrix' || ($_GET['type'] ?? '') === 'matrix') {
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
    $dept = $_GET['department'] ?? '';
    $userId = !empty($_GET['user_id']) ? (int)$_GET['user_id'] : null;

    if ($month < 1 || $month > 12) {
        $month = (int)date('m');
    }
    if ($year < 2000 || $year > 2100) {
        $year = (int)date('Y');
    }

    $monthStr = str_pad($month, 2, '0', STR_PAD_LEFT);
    $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
    $startDate = "$year-$monthStr-01";
    $endDate = "$year-$monthStr-" . str_pad($daysInMonth, 2, '0', STR_PAD_LEFT);

    // Days Header structure: 1 to daysInMonth (e.g. 1 to 31)
    $daysHeader = [];
    $totalWorkdaysInMonth = 0;
    for ($d = 1; $d <= $daysInMonth; $d++) {
        $dayStr = str_pad($d, 2, '0', STR_PAD_LEFT);
        $dateStr = "$year-$monthStr-$dayStr";
        $timestamp = strtotime($dateStr);
        $dayOfWeek = (int)date('N', $timestamp); // 1 (Mon) to 7 (Sun)
        $dayShort = date('D', $timestamp); // Mon, Tue...
        $isWeekend = ($dayOfWeek == 5 || $dayOfWeek == 6 || $dayOfWeek == 7); // Fri/Sat/Sun typical in GCC / Int'l
        $isOfficialOff = ($dayOfWeek == 5 || $dayOfWeek == 6); // Fri & Sat

        if (!$isOfficialOff) {
            $totalWorkdaysInMonth++;
        }

        $daysHeader[] = [
            'day' => $d,
            'date' => $dateStr,
            'day_name' => $dayShort,
            'day_of_week' => $dayOfWeek,
            'is_weekend' => $isOfficialOff
        ];
    }

    // Fetch active users
    $userSql = "
        SELECT u.id, u.user_code, u.full_name, u.user_type, u.department, u.designation, u.profile_photo,
               s.name as shift_name, s.start_time as shift_start, s.end_time as shift_end, s.total_hours as shift_daily_hours
        FROM users u
        LEFT JOIN shifts s ON u.shift_id = s.id
        WHERE u.status = 'Active'
    ";
    $userParams = [];
    if (!empty($userId)) {
        $userSql .= " AND u.id = :user_id";
        $userParams[':user_id'] = $userId;
    }
    if (!empty($dept)) {
        $userSql .= " AND u.department = :dept";
        $userParams[':dept'] = $dept;
    }
    $userSql .= " ORDER BY u.full_name ASC";
    $stmtUsers = $db->prepare($userSql);
    $stmtUsers->execute($userParams);
    $users = $stmtUsers->fetchAll();

    // Fetch daily attendance summaries for this month
    $summarySql = "
        SELECT s.*, u.id as u_id
        FROM daily_attendance_summary s
        JOIN users u ON s.user_id = u.id
        WHERE s.attendance_date BETWEEN :start_date AND :end_date
    ";
    $summaryParams = [':start_date' => $startDate, ':end_date' => $endDate];
    if (!empty($userId)) {
        $summarySql .= " AND s.user_id = :user_id";
        $summaryParams[':user_id'] = $userId;
    }
    if (!empty($dept)) {
        $summarySql .= " AND u.department = :dept";
        $summaryParams[':dept'] = $dept;
    }
    $stmtSummary = $db->prepare($summarySql);
    $stmtSummary->execute($summaryParams);
    $summaries = $stmtSummary->fetchAll();

    // Index summaries by "userId_YYYY-MM-DD"
    $summaryMap = [];
    foreach ($summaries as $sm) {
        $key = $sm['user_id'] . '_' . $sm['attendance_date'];
        $summaryMap[$key] = $sm;
    }

    // Build the Matrix rows
    $matrixRows = [];
    $todayDate = date('Y-m-d');

    foreach ($users as $user) {
        $uId = (int)$user['id'];
        $dailyHoursTarget = !empty($user['shift_daily_hours']) ? (float)$user['shift_daily_hours'] : 7.00;
        $expectedMonthlyHours = round($totalWorkdaysInMonth * $dailyHoursTarget, 1);

        $totalWorkedMinutes = 0;
        $totalLateMinutes = 0;
        $totalEarlyMinutes = 0;
        $presentDaysCount = 0;
        $absentDaysCount = 0;
        $lateDaysCount = 0;
        $earlyDaysCount = 0;

        $daysData = [];

        foreach ($daysHeader as $dh) {
            $dayNum = $dh['day'];
            $dateStr = $dh['date'];
            $isWeekend = $dh['is_weekend'];
            $isFuture = ($dateStr > $todayDate);

            $key = $uId . '_' . $dateStr;
            $sm = $summaryMap[$key] ?? null;

            if ($sm && (!empty($sm['first_in']) || (float)$sm['total_hours'] > 0)) {
                $inTime = !empty($sm['first_in']) ? substr($sm['first_in'], 0, 5) : '--:--';
                $outTime = !empty($sm['last_out']) ? substr($sm['last_out'], 0, 5) : '--:--';

                $insideMins = (int)($sm['total_inside_minutes'] ?? 0);
                if ($insideMins === 0 && !empty($sm['total_hours'])) {
                    $insideMins = (int)round((float)$sm['total_hours'] * 60);
                }
                $twhHours = floor($insideMins / 60);
                $twhMins = $insideMins % 60;
                $twhFormatted = sprintf("%d:%02d Hrs", $twhHours, $twhMins);

                $lateMins = (int)($sm['late_in_mins'] ?? 0);
                $earlyMins = (int)($sm['early_out_mins'] ?? 0);

                if ($lateMins > 0) {
                    $lateHours = floor($lateMins / 60);
                    $lateRemainMins = $lateMins % 60;
                    $lateFormatted = $lateHours > 0 ? sprintf("%dh %dm", $lateHours, $lateRemainMins) : sprintf("%d Mins", $lateRemainMins);
                } else {
                    $lateFormatted = null;
                }

                if ($earlyMins > 0) {
                    $earlyHours = floor($earlyMins / 60);
                    $earlyRemainMins = $earlyMins % 60;
                    $earlyFormatted = $earlyHours > 0 ? sprintf("%dh %dm", $earlyHours, $earlyRemainMins) : sprintf("%d Mins", $earlyRemainMins);
                } else {
                    $earlyFormatted = null;
                }

                $status = $sm['status'] ?? 'Present';
                $totalWorkedMinutes += $insideMins;
                $totalLateMinutes += $lateMins;
                $totalEarlyMinutes += $earlyMins;
                $presentDaysCount++;
                if ($lateMins > 0) $lateDaysCount++;
                if ($earlyMins > 0) $earlyDaysCount++;

                $daysData[$dayNum] = [
                    'day' => $dayNum,
                    'date' => $dateStr,
                    'status' => $status,
                    'has_record' => true,
                    'is_weekend' => $isWeekend,
                    'in_time' => $inTime,
                    'out_time' => $outTime,
                    'twh' => $twhFormatted,
                    'twh_minutes' => $insideMins,
                    'late_by' => $lateFormatted,
                    'late_mins' => $lateMins,
                    'early_by' => $earlyFormatted,
                    'early_mins' => $earlyMins
                ];
            } else {
                if ($isFuture) {
                    $status = 'Upcoming';
                } elseif ($isWeekend) {
                    $status = 'Weekend';
                } else {
                    $status = 'Absent';
                    $absentDaysCount++;
                }

                $daysData[$dayNum] = [
                    'day' => $dayNum,
                    'date' => $dateStr,
                    'status' => $status,
                    'has_record' => false,
                    'is_weekend' => $isWeekend,
                    'in_time' => null,
                    'out_time' => null,
                    'twh' => null,
                    'twh_minutes' => 0,
                    'late_by' => null,
                    'late_mins' => 0,
                    'early_by' => null,
                    'early_mins' => 0
                ];
            }
        }

        // Format Monthly Totals
        $totWorkHrs = floor($totalWorkedMinutes / 60);
        $totWorkMins = $totalWorkedMinutes % 60;
        $totalWorkHoursFormatted = sprintf("%d:%02d Hrs", $totWorkHrs, $totWorkMins);

        $totLateHrs = floor($totalLateMinutes / 60);
        $totLateMins = $totalLateMinutes % 60;
        $totalLateFormatted = $totalLateMinutes > 0 ? sprintf("%d:%02d Hrs", $totLateHrs, $totLateMins) : "0:00 Hrs";

        $totEarlyHrs = floor($totalEarlyMinutes / 60);
        $totEarlyMins = $totalEarlyMinutes % 60;
        $totalEarlyFormatted = $totalEarlyMinutes > 0 ? sprintf("%d:%02d Hrs", $totEarlyHrs, $totEarlyMins) : "0:00 Hrs";

        $matrixRows[] = [
            'user_id' => $uId,
            'user_code' => $user['user_code'],
            'full_name' => $user['full_name'],
            'department' => $user['department'] ?? 'General',
            'designation' => $user['designation'] ?? 'Staff',
            'profile_photo' => $user['profile_photo'],
            'shift_name' => $user['shift_name'] ?? 'Standard Shift',
            'daily_target_hours' => $dailyHoursTarget,
            'monthly_totals' => [
                'total_worked_hours' => $totalWorkHoursFormatted,
                'total_worked_minutes' => $totalWorkedMinutes,
                'expected_hours' => $expectedMonthlyHours . " Hrs",
                'expected_hours_raw' => $expectedMonthlyHours,
                'total_late_hours' => $totalLateFormatted,
                'total_late_minutes' => $totalLateMinutes,
                'total_early_hours' => $totalEarlyFormatted,
                'total_early_minutes' => $totalEarlyMinutes,
                'days_present' => $presentDaysCount,
                'days_absent' => $absentDaysCount,
                'days_late' => $lateDaysCount,
                'days_early' => $earlyDaysCount,
                'workdays_in_month' => $totalWorkdaysInMonth
            ],
            'days' => $daysData
        ];
    }

    jsonResponse([
        'year' => $year,
        'month' => $month,
        'month_name' => date('F Y', strtotime("$year-$monthStr-01")),
        'days_in_month' => $daysInMonth,
        'total_workdays' => $totalWorkdaysInMonth,
        'days_header' => $daysHeader,
        'matrix' => $matrixRows
    ]);
}

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

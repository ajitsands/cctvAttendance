<?php
// backend/helpers/calc.php

require_once __DIR__ . '/../config/db.php';

class AttendanceCalculator {
    
    /**
     * Recalculates and persists daily attendance summary for a user on a given date.
     */
    public static function calculateUserDay($userId, $date = null) {
        $db = Database::getConnection();
        if ($date === null) {
            $date = date('Y-m-d');
        }

        // 1. Fetch user & shift details
        $stmtUser = $db->prepare("
            SELECT u.*, s.start_time, s.end_time, s.grace_late_in, s.grace_early_out, 
                   s.half_day_min_hours, s.full_day_min_hours, s.total_hours as shift_target_hours
            FROM users u
            LEFT JOIN shifts s ON u.shift_id = s.id
            WHERE u.id = ?
        ");
        $stmtUser->execute([$userId]);
        $user = $stmtUser->fetch();
        if (!$user) {
            return null;
        }

        // Fallback default shift timings if none assigned
        $shiftStart = $user['start_time'] ?? '08:00:00';
        $shiftEnd   = $user['end_time'] ?? '17:00:00';
        $graceLate  = (int)($user['grace_late_in'] ?? 15);
        $halfDayMin = (float)($user['half_day_min_hours'] ?? 4.00);
        $fullDayMin = (float)($user['full_day_min_hours'] ?? 7.00);

        // 2. Fetch all raw logs for this date ordered chronologically
        $stmtLogs = $db->prepare("
            SELECT id, direction, punch_time, camera_id, gate_name
            FROM attendance_logs
            WHERE user_id = ? AND punch_date = ?
            ORDER BY punch_time ASC
        ");
        $stmtLogs->execute([$userId, $date]);
        $logs = $stmtLogs->fetchAll();

        if (empty($logs)) {
            // User did not punch on this date -> Absent
            $summary = [
                'user_id' => $userId,
                'attendance_date' => $date,
                'shift_id' => $user['shift_id'],
                'first_in' => null,
                'last_out' => null,
                'current_status' => 'OUTSIDE',
                'total_trips_out' => 0,
                'total_inside_minutes' => 0,
                'total_outside_minutes' => 0,
                'total_hours' => 0.00,
                'late_in_mins' => 0,
                'early_out_mins' => 0,
                'status' => 'Absent'
            ];
            self::saveSummary($db, $summary);
            return $summary;
        }

        // 3. Process logs chronologically
        $firstIn = null;
        $lastOut = null;
        $currentInside = false;
        $lastInTimestamp = null;
        $lastOutTimestamp = null;
        
        $totalInsideSeconds = 0;
        $totalOutsideSeconds = 0;
        $totalTripsOut = 0;

        foreach ($logs as $log) {
            $ts = strtotime($log['punch_time']);
            $dir = strtoupper($log['direction']);

            if ($dir === 'IN') {
                if ($firstIn === null) {
                    $firstIn = date('H:i:s', $ts);
                }

                // If user was previously OUT and now comes IN, calculate OUTSIDE duration
                if ($lastOutTimestamp !== null && !$currentInside) {
                    $outsideSpan = max(0, $ts - $lastOutTimestamp);
                    $totalOutsideSeconds += $outsideSpan;
                    $totalTripsOut++;
                }

                $lastInTimestamp = $ts;
                $currentInside = true;

            } elseif ($dir === 'OUT') {
                $lastOut = date('H:i:s', $ts);

                // If user was inside, calculate INSIDE duration
                if ($lastInTimestamp !== null && $currentInside) {
                    $insideSpan = max(0, $ts - $lastInTimestamp);
                    $totalInsideSeconds += $insideSpan;
                }

                $lastOutTimestamp = $ts;
                $currentInside = false;
            }
        }

        // If currently still inside, add ongoing duration up to now (if date is today)
        if ($currentInside && $date === date('Y-m-d') && $lastInTimestamp !== null) {
            $nowTs = time();
            $liveInsideSpan = max(0, $nowTs - $lastInTimestamp);
            $totalInsideSeconds += $liveInsideSpan;
        }

        $totalInsideMinutes = (int)round($totalInsideSeconds / 60);
        $totalOutsideMinutes = (int)round($totalOutsideSeconds / 60);
        $totalHours = round($totalInsideMinutes / 60, 2);

        // 4. Calculate Late arrival minutes
        $lateInMins = 0;
        if ($firstIn !== null) {
            $shiftStartTs = strtotime($date . ' ' . $shiftStart);
            $firstInTs    = strtotime($date . ' ' . $firstIn);
            $allowedArrival = $shiftStartTs + ($graceLate * 60);

            if ($firstInTs > $allowedArrival) {
                $lateInMins = (int)round(($firstInTs - $shiftStartTs) / 60);
            }
        }

        // 5. Calculate Early departure minutes (if last_out exists and user is outside)
        $earlyOutMins = 0;
        if (!$currentInside && $lastOut !== null) {
            $shiftEndTs = strtotime($date . ' ' . $shiftEnd);
            $lastOutTs  = strtotime($date . ' ' . $lastOut);
            if ($lastOutTs < $shiftEndTs) {
                $earlyOutMins = (int)round(($shiftEndTs - $lastOutTs) / 60);
            }
        }

        // 6. Determine Attendance Status
        $status = 'Present';
        if ($currentInside) {
            $status = ($lateInMins > 0) ? 'Late' : 'Present';
        } else {
            if ($totalHours >= $fullDayMin) {
                $status = ($lateInMins > 0) ? 'Late' : 'Present';
            } elseif ($totalHours >= $halfDayMin) {
                $status = 'Half Day';
            } elseif ($totalHours > 0) {
                $status = 'Under Time';
            } else {
                $status = 'Absent';
            }
        }

        $summary = [
            'user_id' => $userId,
            'attendance_date' => $date,
            'shift_id' => $user['shift_id'],
            'first_in' => $firstIn,
            'last_out' => $lastOut,
            'current_status' => $currentInside ? 'INSIDE' : 'OUTSIDE',
            'total_trips_out' => $totalTripsOut,
            'total_inside_minutes' => $totalInsideMinutes,
            'total_outside_minutes' => $totalOutsideMinutes,
            'total_hours' => $totalHours,
            'late_in_mins' => $lateInMins,
            'early_out_mins' => $earlyOutMins,
            'status' => $status
        ];

        self::saveSummary($db, $summary);

        // 7. Check if Auto-Sync to HR DB is enabled
        self::autoSyncToHr($db, $user, $summary);

        return $summary;
    }

    /**
     * Insert or update daily summary in MySQL
     */
    private static function saveSummary($db, $summary) {
        $sql = "
            INSERT INTO daily_attendance_summary 
            (user_id, attendance_date, shift_id, first_in, last_out, current_status, 
             total_trips_out, total_inside_minutes, total_outside_minutes, total_hours, 
             late_in_mins, early_out_mins, status, last_calculated_at)
            VALUES 
            (:user_id, :attendance_date, :shift_id, :first_in, :last_out, :current_status, 
             :total_trips_out, :total_inside_minutes, :total_outside_minutes, :total_hours, 
             :late_in_mins, :early_out_mins, :status, NOW())
            ON DUPLICATE KEY UPDATE
                shift_id = VALUES(shift_id),
                first_in = VALUES(first_in),
                last_out = VALUES(last_out),
                current_status = VALUES(current_status),
                total_trips_out = VALUES(total_trips_out),
                total_inside_minutes = VALUES(total_inside_minutes),
                total_outside_minutes = VALUES(total_outside_minutes),
                total_hours = VALUES(total_hours),
                late_in_mins = VALUES(late_in_mins),
                early_out_mins = VALUES(early_out_mins),
                status = VALUES(status),
                last_calculated_at = NOW()
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute($summary);
    }

    /**
     * Auto sync record into hr_solution_db if setting is enabled
     */
    public static function autoSyncToHr($db, $user, $summary) {
        try {
            // Check setting
            $stmtSet = $db->query("SELECT setting_value FROM system_settings WHERE setting_key = 'hr_sync_enabled' LIMIT 1");
            $syncEnabled = (int)($stmtSet->fetchColumn() ?: 0);
            if ($syncEnabled !== 1) {
                return;
            }

            $hrConn = Database::getHrConnection();
            if (!$hrConn) {
                return;
            }

            // Find matching employee in hr_solution_db by emp_code
            $stmtEmp = $hrConn->prepare("SELECT id FROM employees WHERE emp_code = ? LIMIT 1");
            $stmtEmp->execute([$user['user_code']]);
            $hrEmpId = $stmtEmp->fetchColumn();

            if (!$hrEmpId) {
                return; // Employee doesn't exist in HR database yet
            }

            // Map status
            $hrStatus = 'Present';
            if ($summary['status'] === 'Late' || $summary['status'] === 'Present') {
                $hrStatus = 'Present';
            } elseif ($summary['status'] === 'Half Day') {
                $hrStatus = 'Half Day';
            } elseif ($summary['status'] === 'Absent') {
                $hrStatus = 'Absent';
            }

            // Insert or update hr_solution_db.attendance
            $hrSql = "
                INSERT INTO attendance 
                (employee_id, date, shift_id, check_in, check_out, late_in_mins, early_out_mins, total_hours, status, source, notes)
                VALUES 
                (:employee_id, :date, :shift_id, :check_in, :check_out, :late_in_mins, :early_out_mins, :total_hours, :status, 'CCTV Face AI (SaNDS Lab)', 'Multi-Gate CCTV AI')
                ON DUPLICATE KEY UPDATE
                    check_in = VALUES(check_in),
                    check_out = VALUES(check_out),
                    late_in_mins = VALUES(late_in_mins),
                    early_out_mins = VALUES(early_out_mins),
                    total_hours = VALUES(total_hours),
                    status = VALUES(status),
                    source = VALUES(source),
                    notes = VALUES(notes)
            ";
            
            $hrStmt = $hrConn->prepare($hrSql);
            $hrStmt->execute([
                ':employee_id' => $hrEmpId,
                ':date' => $summary['attendance_date'],
                ':shift_id' => $summary['shift_id'] ?: 1,
                ':check_in' => $summary['first_in'],
                ':check_out' => $summary['last_out'],
                ':late_in_mins' => $summary['late_in_mins'],
                ':early_out_mins' => $summary['early_out_mins'],
                ':total_hours' => $summary['total_hours'],
                ':status' => $hrStatus
            ]);

            // Update hr_synced flag in cctv_attendance
            $upd = $db->prepare("UPDATE daily_attendance_summary SET hr_synced = 1, hr_synced_at = NOW() WHERE user_id = ? AND attendance_date = ?");
            $upd->execute([$summary['user_id'], $summary['attendance_date']]);

        } catch (Exception $e) {
            // Silently ignore or log sync errors so main flow continues uninterrupted
            error_log("HR Sync Error: " . $e->getMessage());
        }
    }
}

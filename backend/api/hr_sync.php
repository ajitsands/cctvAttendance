<?php
// backend/api/hr_sync.php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/calc.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'status';

if ($action === 'status') {
    $hrConn = Database::getHrConnection();
    if ($hrConn) {
        $empCount = (int)$hrConn->query("SELECT COUNT(*) FROM employees WHERE status = 'Active'")->fetchColumn();
        $attCount = (int)$hrConn->query("SELECT COUNT(*) FROM attendance")->fetchColumn();
        
        jsonResponse([
            'connected' => true,
            'database' => 'hr_solution_db',
            'active_employees' => $empCount,
            'attendance_records' => $attCount,
            'message' => 'Successfully connected to HR Solution database.'
        ]);
    } else {
        jsonResponse([
            'connected' => false,
            'database' => 'hr_solution_db',
            'message' => 'Unable to connect to HR Solution database. Check credentials in Settings.'
        ]);
    }

} elseif ($action === 'import_employees' && $method === 'POST') {
    $hrConn = Database::getHrConnection();
    if (!$hrConn) {
        jsonError('Cannot connect to HR Solution database');
    }

    $hrEmployees = $hrConn->query("
        SELECT id, emp_code, first_name, last_name, email, phone, address, cpr_no, profile_photo, status
        FROM employees
        WHERE status = 'Active'
    ")->fetchAll();

    $imported = 0;
    $updated = 0;

    $stmtCheck = $db->prepare("SELECT id FROM users WHERE user_code = ? LIMIT 1");
    $stmtInsert = $db->prepare("
        INSERT INTO users 
        (user_code, full_name, user_type, email, mobile, address, cpr_no, department, designation, shift_id, profile_photo, hr_employee_id, status)
        VALUES 
        (:user_code, :full_name, 'Employee', :email, :mobile, :address, :cpr_no, 'HR Staff', 'Employee', 1, :profile_photo, :hr_id, 'Active')
    ");
    $stmtUpdate = $db->prepare("
        UPDATE users SET 
            full_name = :full_name, email = :email, mobile = :mobile, address = :address, 
            cpr_no = :cpr_no, hr_employee_id = :hr_id, status = 'Active'
        WHERE id = :id
    ");

    foreach ($hrEmployees as $emp) {
        $fullName = trim($emp['first_name'] . ' ' . $emp['last_name']);
        $stmtCheck->execute([$emp['emp_code']]);
        $existingId = $stmtCheck->fetchColumn();

        if ($existingId) {
            $stmtUpdate->execute([
                ':full_name' => $fullName,
                ':email' => $emp['email'],
                ':mobile' => $emp['phone'],
                ':address' => $emp['address'],
                ':cpr_no' => $emp['cpr_no'],
                ':hr_id' => $emp['id'],
                ':id' => $existingId
            ]);
            $updated++;
        } else {
            $stmtInsert->execute([
                ':user_code' => $emp['emp_code'],
                ':full_name' => $fullName,
                ':email' => $emp['email'],
                ':mobile' => $emp['phone'],
                ':address' => $emp['address'],
                ':cpr_no' => $emp['cpr_no'],
                ':profile_photo' => $emp['profile_photo'],
                ':hr_id' => $emp['id']
            ]);
            $imported++;
        }
    }

    // Log sync
    $logStmt = $db->prepare("
        INSERT INTO hr_sync_logs (sync_type, records_processed, records_affected, status, message)
        VALUES ('IMPORT_EMPLOYEES', ?, ?, 'Success', ?)
    ");
    $logStmt->execute([count($hrEmployees), $imported + $updated, "Imported $imported new, updated $updated existing employees."]);

    jsonResponse([
        'total_in_hr' => count($hrEmployees),
        'imported_new' => $imported,
        'updated_existing' => $updated
    ], 200, "Successfully imported $imported new and updated $updated employees from HR Solution DB");

} elseif ($action === 'export_attendance' && $method === 'POST') {
    $date = $_GET['date'] ?? date('Y-m-d');
    $hrConn = Database::getHrConnection();
    if (!$hrConn) {
        jsonError('Cannot connect to HR Solution database');
    }

    // Fetch summaries from cctv_attendance for this date
    $stmt = $db->prepare("
        SELECT s.*, u.user_code, u.hr_employee_id
        FROM daily_attendance_summary s
        JOIN users u ON s.user_id = u.id
        WHERE s.attendance_date = ?
    ");
    $stmt->execute([$date]);
    $summaries = $stmt->fetchAll();

    $synced = 0;
    foreach ($summaries as $row) {
        // Find employee_id in hr_solution_db
        $empId = $row['hr_employee_id'];
        if (!$empId) {
            $stmtFind = $hrConn->prepare("SELECT id FROM employees WHERE emp_code = ? LIMIT 1");
            $stmtFind->execute([$row['user_code']]);
            $empId = $stmtFind->fetchColumn();
        }

        if ($empId) {
            $hrStatus = 'Present';
            if ($row['status'] === 'Half Day') $hrStatus = 'Half Day';
            if ($row['status'] === 'Absent') $hrStatus = 'Absent';

            $hrStmt = $hrConn->prepare("
                INSERT INTO attendance 
                (employee_id, date, shift_id, check_in, check_out, late_in_mins, early_out_mins, total_hours, status, source, notes)
                VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CCTV Face AI (SaNDS Lab)', 'Multi-Gate CCTV AI Sync')
                ON DUPLICATE KEY UPDATE
                    check_in = VALUES(check_in),
                    check_out = VALUES(check_out),
                    late_in_mins = VALUES(late_in_mins),
                    early_out_mins = VALUES(early_out_mins),
                    total_hours = VALUES(total_hours),
                    status = VALUES(status),
                    source = VALUES(source),
                    notes = VALUES(notes)
            ");
            $hrStmt->execute([
                $empId,
                $date,
                $row['shift_id'] ?: 1,
                $row['first_in'],
                $row['last_out'],
                $row['late_in_mins'],
                $row['early_out_mins'],
                $row['total_hours'],
                $hrStatus
            ]);

            $db->prepare("UPDATE daily_attendance_summary SET hr_synced = 1, hr_synced_at = NOW() WHERE id = ?")->execute([$row['id']]);
            $synced++;
        }
    }

    $logStmt = $db->prepare("
        INSERT INTO hr_sync_logs (sync_type, records_processed, records_affected, status, message)
        VALUES ('EXPORT_ATTENDANCE', ?, ?, 'Success', ?)
    ");
    $logStmt->execute([count($summaries), $synced, "Pushed $synced records to HR Solution DB for date $date."]);

    jsonResponse([
        'date' => $date,
        'records_synced' => $synced
    ], 200, "Successfully synced $synced attendance records to HR Solution DB");

} elseif ($action === 'history') {
    $logs = $db->query("SELECT * FROM hr_sync_logs ORDER BY id DESC LIMIT 20")->fetchAll();
    jsonResponse($logs);
} else {
    jsonError('Invalid action', 400);
}

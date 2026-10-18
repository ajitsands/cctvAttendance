<?php
// backend/api/shifts.php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $shifts = $db->query("SELECT * FROM shifts WHERE is_active = 1 ORDER BY id ASC")->fetchAll();
    jsonResponse($shifts);

} elseif ($method === 'POST') {
    $input = getJsonInput();

    $id = $input['id'] ?? null;
    $name = trim($input['name'] ?? '');
    $code = trim($input['code'] ?? '');
    $type = $input['shift_type'] ?? 'Office';
    $startTime = $input['start_time'] ?? '08:00:00';
    $endTime = $input['end_time'] ?? '17:00:00';
    $totalHours = (float)($input['total_hours'] ?? 8.00);
    $breakMins = (int)($input['break_minutes'] ?? 60);
    $graceLate = (int)($input['grace_late_in'] ?? 15);
    $graceEarly = (int)($input['grace_early_out'] ?? 15);
    $halfDayMin = (float)($input['half_day_min_hours'] ?? 4.00);
    $fullDayMin = (float)($input['full_day_min_hours'] ?? 7.00);
    $color = $input['color_code'] ?? '#2563eb';

    if (empty($name)) {
        jsonError('Shift name is required');
    }
    if (empty($code)) {
        $code = 'SH-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $name), 0, 4)) . '-' . rand(10, 99);
    }

    if ($id) {
        $stmt = $db->prepare("
            UPDATE shifts SET 
                name = ?, code = ?, shift_type = ?, start_time = ?, end_time = ?, 
                total_hours = ?, break_minutes = ?, grace_late_in = ?, grace_early_out = ?, 
                half_day_min_hours = ?, full_day_min_hours = ?, color_code = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $name, $code, $type, $startTime, $endTime,
            $totalHours, $breakMins, $graceLate, $graceEarly,
            $halfDayMin, $fullDayMin, $color, $id
        ]);
        jsonResponse(['id' => $id], 200, 'Shift updated successfully');
    } else {
        $stmt = $db->prepare("
            INSERT INTO shifts 
            (name, code, shift_type, start_time, end_time, total_hours, break_minutes, grace_late_in, grace_early_out, half_day_min_hours, full_day_min_hours, color_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $name, $code, $type, $startTime, $endTime,
            $totalHours, $breakMins, $graceLate, $graceEarly,
            $halfDayMin, $fullDayMin, $color
        ]);
        jsonResponse(['id' => $db->lastInsertId()], 201, 'Shift created successfully');
    }

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonError('Shift ID is required');
    }
    $db->prepare("UPDATE shifts SET is_active = 0 WHERE id = ?")->execute([$id]);
    jsonResponse(['id' => $id], 200, 'Shift removed');
} else {
    jsonError('Method not allowed', 405);
}

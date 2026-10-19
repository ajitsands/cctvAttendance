<?php
// backend/api/guests.php
// Version 2.0 Unknown Persons -> Guest & Customer Movement Tracking API

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

function notifyFaceEngineReloadGuests() {
    $ctx = stream_context_create(['http' => ['timeout' => 0.8, 'ignore_errors' => true]]);
    @file_get_contents('http://127.0.0.1:8001/reload_guests', false, $ctx);
}

if ($method === 'GET') {
    // Action: Sync embeddings for Python AI Engine
    if (($_GET['action'] ?? '') === 'sync_embeddings') {
        $stmt = $db->query("
            SELECT id, guest_code, guest_name, guest_type, face_embedding 
            FROM guests 
            WHERE face_embedding IS NOT NULL AND face_embedding != ''
        ");
        jsonResponse($stmt->fetchAll());
    }

    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    // 1. Fetch single guest with complete visit movement timeline
    if ($id) {
        $stmt = $db->prepare("SELECT * FROM guests WHERE id = ?");
        $stmt->execute([$id]);
        $guest = $stmt->fetch();
        if (!$guest) {
            jsonError('Guest not found', 404);
        }

        // Fetch logs
        $logStmt = $db->prepare("
            SELECT l.*, c.camera_name, c.camera_role
            FROM guest_logs l
            LEFT JOIN cameras c ON l.camera_id = c.id
            WHERE l.guest_id = ?
            ORDER BY l.punch_time DESC
        ");
        $logStmt->execute([$id]);
        $logs = $logStmt->fetchAll();

        $guest['total_inside_hours'] = round($guest['total_inside_minutes'] / 60, 2);
        $guest['avg_visit_minutes'] = $guest['total_visits'] > 0 
            ? (int)round($guest['total_inside_minutes'] / $guest['total_visits']) 
            : 0;
        $guest['logs'] = $logs;

        jsonResponse($guest);
    }

    // 2. Fetch list of guests with date range and classification filters
    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $endDate   = $_GET['end_date'] ?? date('Y-m-d');
    $guestType = $_GET['guest_type'] ?? '';
    $status    = $_GET['status'] ?? ''; // INSIDE or OUTSIDE
    $search    = $_GET['search'] ?? '';

    $sql = "
        SELECT g.*,
               ROUND(g.total_inside_minutes / 60, 2) as total_inside_hours,
               CASE 
                   WHEN g.total_visits > 0 THEN ROUND(g.total_inside_minutes / g.total_visits) 
                   ELSE 0 
               END as avg_visit_minutes
        FROM guests g
        WHERE 1=1
    ";
    $params = [];

    // Filter by date range (guests seen between dates)
    if (!empty($startDate) && !empty($endDate)) {
        $sql .= " AND DATE(g.last_seen_at) BETWEEN :start_date AND :end_date";
        $params[':start_date'] = $startDate;
        $params[':end_date'] = $endDate;
    }

    if (!empty($guestType)) {
        $sql .= " AND g.guest_type = :guest_type";
        $params[':guest_type'] = $guestType;
    }

    if (!empty($status)) {
        $sql .= " AND g.current_status = :status";
        $params[':status'] = $status;
    }

    if (!empty($search)) {
        $sql .= " AND (g.guest_name LIKE :search OR g.guest_code LIKE :search OR g.company_name LIKE :search OR g.phone LIKE :search)";
        $params[':search'] = "%{$search}%";
    }

    $sql .= " ORDER BY g.last_seen_at DESC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $guestsList = $stmt->fetchAll();

    // Summary Analytics
    $totalGuestsCount = count($guestsList);
    $currentlyInside = 0;
    $totalVisitsSum = 0;
    $totalInsideMinutesSum = 0;

    foreach ($guestsList as $g) {
        if ($g['current_status'] === 'INSIDE') {
            $currentlyInside++;
        }
        $totalVisitsSum += (int)$g['total_visits'];
        $totalInsideMinutesSum += (int)$g['total_inside_minutes'];
    }

    $totalHoursSum = round($totalInsideMinutesSum / 60, 2);
    $overallAvgVisitMinutes = $totalVisitsSum > 0 ? (int)round($totalInsideMinutesSum / $totalVisitsSum) : 0;

    jsonResponse([
        'filter' => [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'guest_type' => $guestType,
            'status' => $status,
            'search' => $search
        ],
        'totals' => [
            'total_guests' => $totalGuestsCount,
            'currently_inside' => $currentlyInside,
            'total_visits' => $totalVisitsSum,
            'total_inside_hours' => $totalHoursSum,
            'avg_visit_minutes' => $overallAvgVisitMinutes
        ],
        'guests' => $guestsList
    ]);
}

if ($method === 'POST') {
    $action = $_GET['action'] ?? '';

    // Action: Record movement or auto-enroll guest from Python AI engine
    if ($action === 'record_movement') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $guestId = !empty($input['guest_id']) ? (int)$input['guest_id'] : null;
        $cameraId = !empty($input['camera_id']) ? (int)$input['camera_id'] : null;
        $gateName = $input['gate_name'] ?? 'Main Gate';
        $direction = $input['direction'] ?? 'IN';
        $confidence = (float)($input['confidence_score'] ?? 0.0);
        $snapshot = $input['snapshot'] ?? null;
        $embedding = $input['face_embedding'] ?? null;

        // Save snapshot if provided
        $snapshotPath = null;
        if (!empty($snapshot)) {
            $uploadDir = __DIR__ . '/../../uploads/guests';
            if (!is_dir($uploadDir)) {
                @mkdir($uploadDir, 0777, true);
            }
            $filename = 'guest_' . time() . '_' . rand(100, 999) . '.jpg';
            $filePath = $uploadDir . '/' . $filename;
            if (preg_match('/^data:image\/(\w+);base64,/', $snapshot, $type)) {
                $data = substr($snapshot, strpos($snapshot, ',') + 1);
                $decoded = base64_decode($data);
                if ($decoded) {
                    file_put_contents($filePath, $decoded);
                    $snapshotPath = '/uploads/guests/' . $filename;
                }
            }
        }

        $now = date('Y-m-d H:i:s');
        $today = date('Y-m-d');
        $durationMinutes = 0;

        // 1. Existing recognized guest
        if ($guestId && $guestId > 0) {
            $stmt = $db->prepare("SELECT * FROM guests WHERE id = ?");
            $stmt->execute([$guestId]);
            $guest = $stmt->fetch();

            if ($guest) {
                // If OUT punch, calculate duration since their last IN punch today
                if ($direction === 'OUT') {
                    $lastInStmt = $db->prepare("
                        SELECT punch_time FROM guest_logs 
                        WHERE guest_id = :gid AND direction = 'IN' 
                        ORDER BY punch_time DESC LIMIT 1
                    ");
                    $lastInStmt->execute([':gid' => $guestId]);
                    $lastInTime = $lastInStmt->fetchColumn();

                    if ($lastInTime) {
                        $diffSeconds = strtotime($now) - strtotime($lastInTime);
                        if ($diffSeconds > 0) {
                            $durationMinutes = (int)round($diffSeconds / 60);
                        }
                    }

                    // Update guest total inside minutes and status
                    $db->prepare("
                        UPDATE guests 
                        SET current_status = 'OUTSIDE', 
                            total_inside_minutes = total_inside_minutes + :dur,
                            latest_photo = COALESCE(:photo, latest_photo),
                            last_seen_at = :now
                        WHERE id = :id
                    ")->execute([
                        ':dur' => $durationMinutes,
                        ':photo' => $snapshotPath,
                        ':now' => $now,
                        ':id' => $guestId
                    ]);
                } else {
                    // IN punch: Increment visits and mark INSIDE
                    $db->prepare("
                        UPDATE guests 
                        SET current_status = 'INSIDE', 
                            total_visits = total_visits + 1,
                            latest_photo = COALESCE(:photo, latest_photo),
                            last_seen_at = :now
                        WHERE id = :id
                    ")->execute([
                        ':photo' => $snapshotPath,
                        ':now' => $now,
                        ':id' => $guestId
                    ]);
                }

                // Log movement event
                $db->prepare("
                    INSERT INTO guest_logs 
                    (guest_id, camera_id, direction, gate_name, punch_time, punch_date, duration_minutes, confidence_score, snapshot_path)
                    VALUES (:gid, :cid, :dir, :gate, :time, :date, :dur, :conf, :snap)
                ")->execute([
                    ':gid' => $guestId,
                    ':cid' => $cameraId,
                    ':dir' => $direction,
                    ':gate' => $gateName,
                    ':time' => $now,
                    ':date' => $today,
                    ':dur' => $durationMinutes,
                    ':conf' => $confidence,
                    ':snap' => $snapshotPath
                ]);

                jsonResponse([
                    'success' => true,
                    'is_new' => false,
                    'guest_id' => $guestId,
                    'guest_code' => $guest['guest_code'],
                    'duration_minutes' => $durationMinutes
                ]);
            }
        }

        // 2. Brand new guest auto-enrollment
        $lastId = (int)$db->query("SELECT MAX(id) FROM guests")->fetchColumn();
        $guestCode = 'GST-' . date('Ymd') . '-' . str_pad($lastId + 1, 3, '0', STR_PAD_LEFT);
        $embJson = is_string($embedding) ? $embedding : json_encode($embedding);

        $db->prepare("
            INSERT INTO guests 
            (guest_code, guest_name, guest_type, first_photo, latest_photo, face_embedding, total_visits, total_inside_minutes, current_status, first_seen_at, last_seen_at)
            VALUES (:code, 'Guest / Visitor', 'Visitor', :p1, :p2, :emb, 1, 0, :status, :seen, :seen)
        ")->execute([
            ':code' => $guestCode,
            ':p1' => $snapshotPath,
            ':p2' => $snapshotPath,
            ':emb' => $embJson,
            ':status' => ($direction === 'OUT' ? 'OUTSIDE' : 'INSIDE'),
            ':seen' => $now
        ]);

        $newGuestId = (int)$db->lastInsertId();

        $db->prepare("
            INSERT INTO guest_logs 
            (guest_id, camera_id, direction, gate_name, punch_time, punch_date, duration_minutes, confidence_score, snapshot_path)
            VALUES (:gid, :cid, :dir, :gate, :time, :date, 0, :conf, :snap)
        ")->execute([
            ':gid' => $newGuestId,
            ':cid' => $cameraId,
            ':dir' => $direction,
            ':gate' => $gateName,
            ':time' => $now,
            ':date' => $today,
            ':conf' => $confidence,
            ':snap' => $snapshotPath
        ]);

        notifyFaceEngineReloadGuests();

        jsonResponse([
            'success' => true,
            'is_new' => true,
            'guest_id' => $newGuestId,
            'guest_code' => $guestCode
        ], 201);
    }

    jsonError('Unsupported POST action', 400);
}

if ($method === 'PUT') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonError('Invalid Guest ID', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $guestName = trim($input['guest_name'] ?? '');
    $guestType = $input['guest_type'] ?? 'Visitor';
    $companyName = trim($input['company_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $notes = trim($input['notes'] ?? '');

    if (empty($guestName)) {
        $guestName = 'Guest / Visitor';
    }

    $stmt = $db->prepare("
        UPDATE guests 
        SET guest_name = :name, guest_type = :type, company_name = :company, phone = :phone, notes = :notes
        WHERE id = :id
    ");
    $stmt->execute([
        ':name' => $guestName,
        ':type' => $guestType,
        ':company' => $companyName,
        ':phone' => $phone,
        ':notes' => $notes,
        ':id' => $id
    ]);

    notifyFaceEngineReloadGuests();
    jsonResponse(['message' => 'Guest details updated successfully.']);
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonError('Invalid Guest ID', 400);
    }

    $stmt = $db->prepare("DELETE FROM guests WHERE id = ?");
    $stmt->execute([$id]);

    notifyFaceEngineReloadGuests();
    jsonResponse(['message' => 'Guest record removed successfully.']);
}

<?php
// backend/api/blacklist.php
// Version 2.0 Blacklisted Persons Security Management API

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

function notifyFaceEngineReload() {
    $ctx = stream_context_create(['http' => ['timeout' => 0.8, 'ignore_errors' => true]]);
    @file_get_contents('http://127.0.0.1:8001/reload_blacklist', false, $ctx);
}

if ($method === 'GET') {
    // Action: Sync embeddings for Python AI Engine
    if (($_GET['action'] ?? '') === 'sync_embeddings') {
        $stmt = $db->query("
            SELECT id, person_code, full_name, threat_level, reason, photo_url, face_embedding 
            FROM blacklisted_persons 
            WHERE status = 'Active' AND face_embedding IS NOT NULL AND face_embedding != ''
        ");
        jsonResponse($stmt->fetchAll());
    }

    // 1. If fetching breach incidents
    if (isset($_GET['breaches'])) {
        $statusFilter = $_GET['status'] ?? ''; // 'unresolved' or 'all'
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;

        $sql = "
            SELECT b.*, p.person_code, p.full_name, p.threat_level, p.reason as blacklist_reason, p.photo_url as reference_photo
            FROM blacklist_breach_logs b
            JOIN blacklisted_persons p ON b.blacklisted_person_id = p.id
            WHERE 1=1
        ";
        if ($statusFilter === 'unresolved') {
            $sql .= " AND b.is_resolved = 0";
        }
        $sql .= " ORDER BY b.detected_at DESC LIMIT " . $limit;
        $stmt = $db->query($sql);
        $breaches = $stmt->fetchAll();

        // Calculate summary stats
        $totalBreaches = $db->query("SELECT COUNT(*) FROM blacklist_breach_logs")->fetchColumn();
        $unresolvedCount = $db->query("SELECT COUNT(*) FROM blacklist_breach_logs WHERE is_resolved = 0")->fetchColumn();
        $todayBreaches = $db->query("SELECT COUNT(*) FROM blacklist_breach_logs WHERE DATE(detected_at) = CURDATE()")->fetchColumn();

        jsonResponse([
            'stats' => [
                'total_breaches' => (int)$totalBreaches,
                'unresolved_breaches' => (int)$unresolvedCount,
                'today_breaches' => (int)$todayBreaches
            ],
            'breaches' => $breaches
        ]);
    }

    // 2. If fetching specific individual
    $id = $_GET['id'] ?? null;
    if ($id) {
        $stmt = $db->prepare("SELECT * FROM blacklisted_persons WHERE id = ?");
        $stmt->execute([$id]);
        $person = $stmt->fetch();
        if (!$person) {
            jsonError('Blacklisted record not found', 404);
        }
        $person['has_face_enrolled'] = !empty($person['face_embedding']);
        jsonResponse($person);
    }

    // 3. List all blacklisted persons
    $search = $_GET['search'] ?? '';
    $threat = $_GET['threat_level'] ?? '';
    $status = $_GET['status'] ?? '';

    $sql = "SELECT id, person_code, full_name, threat_level, reason, photo_url, face_embedding, notes, status, created_at, (face_embedding IS NOT NULL AND face_embedding != '') as has_face_enrolled FROM blacklisted_persons WHERE 1=1";
    $params = [];

    if (!empty($search)) {
        $sql .= " AND (full_name LIKE :search OR person_code LIKE :search OR reason LIKE :search)";
        $params[':search'] = "%{$search}%";
    }
    if (!empty($threat)) {
        $sql .= " AND threat_level = :threat";
        $params[':threat'] = $threat;
    }
    if (!empty($status)) {
        $sql .= " AND status = :status";
        $params[':status'] = $status;
    }

    $sql .= " ORDER BY id DESC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $list = $stmt->fetchAll();

    // Stats
    $totalCount = count($list);
    $criticalCount = 0;
    $highCount = 0;
    $activeCount = 0;
    foreach ($list as $p) {
        if ($p['threat_level'] === 'Critical') $criticalCount++;
        elseif ($p['threat_level'] === 'High') $highCount++;
        if ($p['status'] === 'Active') $activeCount++;
    }

    jsonResponse([
        'stats' => [
            'total_blacklisted' => $totalCount,
            'active_count' => $activeCount,
            'critical_count' => $criticalCount,
            'high_count' => $highCount
        ],
        'blacklisted_persons' => $list
    ]);
}

if ($method === 'POST') {
    $action = $_GET['action'] ?? '';

    // Action: Log security breach incident from Python AI engine
    if ($action === 'log_breach') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $personId = (int)($input['blacklisted_person_id'] ?? 0);
        $cameraId = !empty($input['camera_id']) ? (int)$input['camera_id'] : null;
        $gateName = $input['gate_name'] ?? 'Main Gate';
        $direction = $input['direction'] ?? 'IN';
        $confidence = (float)($input['confidence_score'] ?? 0.0);
        $snapshot = $input['snapshot'] ?? null;

        if ($personId <= 0) {
            jsonError('Invalid blacklisted person ID', 400);
        }

        $snapshotPath = null;
        if (!empty($snapshot)) {
            $backendUploadDir = __DIR__ . '/../uploads/breaches';
            $frontendUploadDir = __DIR__ . '/../../frontend/public/uploads/breaches';
            $rootUploadDir = __DIR__ . '/../../uploads/breaches';

            foreach ([$backendUploadDir, $frontendUploadDir, $rootUploadDir] as $dir) {
                if (!is_dir($dir)) {
                    @mkdir($dir, 0777, true);
                }
            }

            $filename = 'breach_' . $personId . '_' . time() . '.jpg';
            if (preg_match('/^data:image\/(\w+);base64,/', $snapshot, $type)) {
                $data = substr($snapshot, strpos($snapshot, ',') + 1);
                $decoded = base64_decode($data);
                if ($decoded) {
                    file_put_contents($backendUploadDir . '/' . $filename, $decoded);
                    @file_put_contents($frontendUploadDir . '/' . $filename, $decoded);
                    @file_put_contents($rootUploadDir . '/' . $filename, $decoded);
                    $snapshotPath = '/uploads/breaches/' . $filename;
                }
            }
        }

        $stmt = $db->prepare("
            INSERT INTO blacklist_breach_logs 
            (blacklisted_person_id, camera_id, gate_name, direction, confidence_score, snapshot_path, detected_at, is_resolved)
            VALUES (:pid, :cid, :gate, :dir, :conf, :snap, NOW(), 0)
        ");
        $stmt->execute([
            ':pid' => $personId,
            ':cid' => $cameraId,
            ':gate' => $gateName,
            ':dir' => $direction,
            ':conf' => $confidence,
            ':snap' => $snapshotPath
        ]);

        $breachId = (int)$db->lastInsertId();
        jsonResponse([
            'success' => true,
            'breach_id' => $breachId,
            'message' => 'Security breach logged.'
        ], 201);
    }

    // Action: Resolve security breach incident
    if ($action === 'resolve') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $breachId = (int)($input['breach_id'] ?? 0);
        $resolvedBy = trim($input['resolved_by'] ?? 'Security Officer');
        $resolvedNotes = trim($input['resolved_notes'] ?? 'Action taken and verified.');

        if ($breachId <= 0) {
            jsonError('Invalid breach incident ID', 400);
        }

        $stmt = $db->prepare("
            UPDATE blacklist_breach_logs 
            SET is_resolved = 1, resolved_by = :by, resolved_notes = :notes, resolved_at = NOW() 
            WHERE id = :id
        ");
        $stmt->execute([
            ':by' => $resolvedBy,
            ':notes' => $resolvedNotes,
            ':id' => $breachId
        ]);

        jsonResponse(['success' => true, 'message' => 'Security breach marked as resolved.']);
    }

    // Default POST: Create new blacklisted person
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $fullName = trim($input['full_name'] ?? '');
    $reason = trim($input['reason'] ?? '');
    $threatLevel = $input['threat_level'] ?? 'High';
    $notes = trim($input['notes'] ?? '');
    $photoUrl = $input['photo_url'] ?? null;
    $faceEmbedding = !empty($input['face_embedding']) 
        ? (is_string($input['face_embedding']) ? $input['face_embedding'] : json_encode($input['face_embedding']))
        : null;

    if (empty($fullName) || empty($reason)) {
        jsonError('Full Name and Reason for Blacklisting are required', 400);
    }

    // Generate Person Code
    $personCode = trim($input['person_code'] ?? '');
    if (empty($personCode)) {
        $lastId = (int)$db->query("SELECT MAX(id) FROM blacklisted_persons")->fetchColumn();
        $personCode = 'BLK-' . str_pad($lastId + 1, 3, '0', STR_PAD_LEFT);
    }

    $stmt = $db->prepare("
        INSERT INTO blacklisted_persons 
        (person_code, full_name, threat_level, reason, photo_url, face_embedding, notes, status)
        VALUES (:code, :name, :threat, :reason, :photo, :emb, :notes, 'Active')
    ");
    $stmt->execute([
        ':code' => $personCode,
        ':name' => $fullName,
        ':threat' => $threatLevel,
        ':reason' => $reason,
        ':photo' => $photoUrl,
        ':emb' => $faceEmbedding,
        ':notes' => $notes
    ]);

    $newId = (int)$db->lastInsertId();
    notifyFaceEngineReload();

    jsonResponse([
        'id' => $newId,
        'person_code' => $personCode,
        'message' => 'Blacklisted individual successfully enrolled.'
    ], 201);
}

if ($method === 'PUT') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonError('Invalid ID', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $fullName = trim($input['full_name'] ?? '');
    $reason = trim($input['reason'] ?? '');
    $threatLevel = $input['threat_level'] ?? 'High';
    $notes = trim($input['notes'] ?? '');
    $status = $input['status'] ?? 'Active';
    $photoUrl = $input['photo_url'] ?? null;
    $faceEmbedding = !empty($input['face_embedding']) 
        ? (is_string($input['face_embedding']) ? $input['face_embedding'] : json_encode($input['face_embedding']))
        : null;

    if (empty($fullName) || empty($reason)) {
        jsonError('Full Name and Reason are required', 400);
    }

    $sql = "
        UPDATE blacklisted_persons 
        SET full_name = :name, threat_level = :threat, reason = :reason, notes = :notes, status = :status
    ";
    $params = [
        ':name' => $fullName,
        ':threat' => $threatLevel,
        ':reason' => $reason,
        ':notes' => $notes,
        ':status' => $status,
        ':id' => $id
    ];

    if ($photoUrl !== null) {
        $sql .= ", photo_url = :photo";
        $params[':photo'] = $photoUrl;
    }
    if ($faceEmbedding !== null) {
        $sql .= ", face_embedding = :emb";
        $params[':emb'] = $faceEmbedding;
    }

    $sql .= " WHERE id = :id";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    notifyFaceEngineReload();
    jsonResponse(['message' => 'Blacklisted person record updated successfully.']);
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonError('Invalid ID', 400);
    }

    $stmt = $db->prepare("DELETE FROM blacklisted_persons WHERE id = ?");
    $stmt->execute([$id]);

    notifyFaceEngineReload();
    jsonResponse(['message' => 'Individual removed from blacklist.']);
}

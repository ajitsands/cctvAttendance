<?php
// backend/api/users.php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

function notifyFaceEngineReload() {
    $ctx = stream_context_create(['http' => ['timeout' => 0.5, 'ignore_errors' => true]]);
    @file_get_contents('http://127.0.0.1:8001/reload_users', false, $ctx);
}

if ($method === 'GET') {
    $id = $_GET['id'] ?? null;

    if ($id) {
        $stmt = $db->prepare("
            SELECT u.*, s.name as shift_name, s.start_time, s.end_time 
            FROM users u
            LEFT JOIN shifts s ON u.shift_id = s.id
            WHERE u.id = ?
        ");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            jsonError('User not found', 404);
        }
        $user['has_face_enrolled'] = !empty($user['face_embedding']);
        jsonResponse($user);
    }

    $dept = $_GET['department'] ?? '';
    $userType = $_GET['user_type'] ?? '';
    $search = $_GET['search'] ?? '';

    $sql = "
        SELECT u.id, u.user_code, u.full_name, u.user_type, u.email, u.mobile, 
               u.address, u.cpr_no, u.department, u.designation, u.shift_id, 
               u.profile_photo, u.face_embedding, u.status, u.created_at,
               (u.face_embedding IS NOT NULL AND u.face_embedding != '') as has_face_enrolled,
               s.name as shift_name, s.start_time, s.end_time
        FROM users u
        LEFT JOIN shifts s ON u.shift_id = s.id
        WHERE 1=1
    ";
    $params = [];

    if (!empty($dept)) {
        $sql .= " AND u.department = :dept";
        $params[':dept'] = $dept;
    }
    if (!empty($userType)) {
        $sql .= " AND u.user_type = :user_type";
        $params[':user_type'] = $userType;
    }
    if (!empty($search)) {
        $sql .= " AND (u.full_name LIKE :search OR u.user_code LIKE :search OR u.mobile LIKE :search OR u.email LIKE :search)";
        $params[':search'] = "%$search%";
    }

    $sql .= " ORDER BY u.id DESC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    jsonResponse($users);

} elseif ($method === 'POST') {
    $input = getJsonInput();

    $action = $_GET['action'] ?? ($input['action'] ?? '');
    if ($action === 'upload_photo') {
        $userId = $input['user_id'] ?? ($_POST['user_id'] ?? null);
        $userCode = $input['user_code'] ?? ($_POST['user_code'] ?? ('user_' . time()));
        $photoData = $input['profile_photo'] ?? null;
        
        $backendDir = __DIR__ . '/../uploads/profiles/';
        $frontendDir = __DIR__ . '/../../frontend/public/uploads/profiles/';
        if (!is_dir($backendDir)) mkdir($backendDir, 0777, true);
        if (!is_dir($frontendDir)) mkdir($frontendDir, 0777, true);

        $photoName = 'user_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userCode) . '_' . time() . '.jpg';
        $saved = false;

        if ($photoData && strpos($photoData, 'data:image') === 0) {
            $parts = explode(',', $photoData);
            $data = base64_decode($parts[1] ?? '');
            if ($data) {
                file_put_contents($backendDir . $photoName, $data);
                file_put_contents($frontendDir . $photoName, $data);
                $saved = true;
            }
        } elseif (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            move_uploaded_file($_FILES['photo']['tmp_name'], $backendDir . $photoName);
            copy($backendDir . $photoName, $frontendDir . $photoName);
            $saved = true;
        }

        if (!$saved) {
            jsonError('No valid photo payload provided');
        }

        $photoUrl = 'http://127.0.0.1:8000/uploads/profiles/' . $photoName;

        if ($userId) {
            $faceEmbedding = $input['face_embedding'] ?? null;
            if (is_array($faceEmbedding)) {
                $faceEmbedding = json_encode($faceEmbedding);
            }
            if ($faceEmbedding) {
                $stmt = $db->prepare("UPDATE users SET profile_photo = ?, face_embedding = ? WHERE id = ?");
                $stmt->execute([$photoUrl, $faceEmbedding, $userId]);
            } else {
                $stmt = $db->prepare("UPDATE users SET profile_photo = ? WHERE id = ?");
                $stmt->execute([$photoUrl, $userId]);
            }
        }

        notifyFaceEngineReload();

        jsonResponse([
            'photo_url' => $photoUrl,
            'photo_name' => $photoName,
            'user_id' => $userId
        ], 200, 'Photo uploaded successfully');
    }

    $id = $input['id'] ?? null;
    $userCode = trim($input['user_code'] ?? '');
    $fullName = trim($input['full_name'] ?? '');
    $userType = $input['user_type'] ?? 'Employee';
    $email = trim($input['email'] ?? '');
    $mobile = trim($input['mobile'] ?? '');
    $address = trim($input['address'] ?? '');
    $cprNo = trim($input['cpr_no'] ?? '');
    $department = trim($input['department'] ?? 'General');
    $designation = trim($input['designation'] ?? 'Staff');
    $shiftId = !empty($input['shift_id']) ? (int)$input['shift_id'] : null;
    $status = $input['status'] ?? 'Active';
    $faceEmbedding = $input['face_embedding'] ?? null;
    $profilePhoto = $input['profile_photo'] ?? null;

    if (empty($fullName)) {
        jsonError('Full Name is required');
    }

    if (empty($userCode)) {
        // Auto-generate user code if empty
        $prefix = ($userType === 'Student') ? 'STU-' : 'EMP-';
        $userCode = $prefix . date('Ym') . rand(100, 999);
    }

    // Check duplicate user_code
    if ($id) {
        $stmtChk = $db->prepare("SELECT id FROM users WHERE user_code = ? AND id != ?");
        $stmtChk->execute([$userCode, $id]);
    } else {
        $stmtChk = $db->prepare("SELECT id FROM users WHERE user_code = ?");
        $stmtChk->execute([$userCode]);
    }
    if ($stmtChk->fetch()) {
        jsonError("User Code '$userCode' is already in use by another person");
    }

    // Handle photo base64 saving to file system
    if ($profilePhoto && strpos($profilePhoto, 'data:image') === 0) {
        $backendDir = __DIR__ . '/../uploads/profiles/';
        $frontendDir = __DIR__ . '/../../frontend/public/uploads/profiles/';
        if (!is_dir($backendDir)) mkdir($backendDir, 0777, true);
        if (!is_dir($frontendDir)) mkdir($frontendDir, 0777, true);

        $parts = explode(',', $profilePhoto);
        $data = base64_decode($parts[1] ?? '');
        if ($data) {
            $photoName = 'user_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userCode) . '_' . time() . '.jpg';
            file_put_contents($backendDir . $photoName, $data);
            file_put_contents($frontendDir . $photoName, $data);
            $profilePhoto = 'http://127.0.0.1:8000/uploads/profiles/' . $photoName;
        }
    } elseif (isset($_FILES['profile_photo_file']) && $_FILES['profile_photo_file']['error'] === UPLOAD_ERR_OK) {
        $backendDir = __DIR__ . '/../uploads/profiles/';
        $frontendDir = __DIR__ . '/../../frontend/public/uploads/profiles/';
        if (!is_dir($backendDir)) mkdir($backendDir, 0777, true);
        if (!is_dir($frontendDir)) mkdir($frontendDir, 0777, true);

        $photoName = 'user_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userCode) . '_' . time() . '.jpg';
        move_uploaded_file($_FILES['profile_photo_file']['tmp_name'], $backendDir . $photoName);
        copy($backendDir . $photoName, $frontendDir . $photoName);
        $profilePhoto = 'http://127.0.0.1:8000/uploads/profiles/' . $photoName;
    }

    // Format face embedding as JSON if array
    if (is_array($faceEmbedding)) {
        $faceEmbedding = json_encode($faceEmbedding);
    }

    if ($id) {
        // Update user
        $sql = "
            UPDATE users SET 
                user_code = :user_code,
                full_name = :full_name,
                user_type = :user_type,
                email = :email,
                mobile = :mobile,
                address = :address,
                cpr_no = :cpr_no,
                department = :department,
                designation = :designation,
                shift_id = :shift_id,
                status = :status" .
                ($profilePhoto ? ", profile_photo = :profile_photo" : "") .
                ($faceEmbedding !== null ? ", face_embedding = :face_embedding" : "") . "
            WHERE id = :id
        ";
        $params = [
            ':user_code' => $userCode,
            ':full_name' => $fullName,
            ':user_type' => $userType,
            ':email' => $email,
            ':mobile' => $mobile,
            ':address' => $address,
            ':cpr_no' => $cprNo,
            ':department' => $department,
            ':designation' => $designation,
            ':shift_id' => $shiftId,
            ':status' => $status,
            ':id' => $id
        ];
        if ($profilePhoto) $params[':profile_photo'] = $profilePhoto;
        if ($faceEmbedding !== null) $params[':face_embedding'] = $faceEmbedding;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $userId = $id;
        $msg = 'User updated successfully';
    } else {
        // Insert user
        $sql = "
            INSERT INTO users 
            (user_code, full_name, user_type, email, mobile, address, cpr_no, department, designation, shift_id, profile_photo, face_embedding, status)
            VALUES 
            (:user_code, :full_name, :user_type, :email, :mobile, :address, :cpr_no, :department, :designation, :shift_id, :profile_photo, :face_embedding, :status)
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':user_code' => $userCode,
            ':full_name' => $fullName,
            ':user_type' => $userType,
            ':email' => $email,
            ':mobile' => $mobile,
            ':address' => $address,
            ':cpr_no' => $cprNo,
            ':department' => $department,
            ':designation' => $designation,
            ':shift_id' => $shiftId,
            ':profile_photo' => $profilePhoto,
            ':face_embedding' => $faceEmbedding,
            ':status' => $status
        ]);
        $userId = $db->lastInsertId();
        $msg = 'User registered successfully';
    }

    notifyFaceEngineReload();
    jsonResponse(['id' => $userId, 'user_code' => $userCode], 200, $msg);

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonError('User ID is required');
    }

    // Soft delete or status Inactive
    $stmt = $db->prepare("UPDATE users SET status = 'Inactive' WHERE id = ?");
    $stmt->execute([$id]);

    notifyFaceEngineReload();
    jsonResponse(['id' => $id], 200, 'User deactivated successfully');
} else {
    jsonError('Method not allowed', 405);
}

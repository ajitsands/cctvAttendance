<?php
// backend/api/cameras.php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

if ($method === 'GET') {
    if ($action === 'pairs') {
        $sql = "
            SELECT p.*, 
                   cin.camera_name as in_camera_name, cin.ip_address as in_ip, cin.status as in_status, cin.rtsp_url as in_rtsp,
                   cout.camera_name as out_camera_name, cout.ip_address as out_ip, cout.status as out_status, cout.rtsp_url as out_rtsp
            FROM camera_pairs p
            LEFT JOIN cameras cin ON p.in_camera_id = cin.id
            LEFT JOIN cameras cout ON p.out_camera_id = cout.id
            ORDER BY p.id ASC
        ";
        $pairs = $db->query($sql)->fetchAll();
        jsonResponse($pairs);
    } else {
        // List all cameras
        $cameras = $db->query("SELECT * FROM cameras ORDER BY id ASC")->fetchAll();
        jsonResponse($cameras);
    }

} elseif ($method === 'POST') {
    $input = getJsonInput();

    if ($action === 'test_ping') {
        $ip = trim($input['ip_address'] ?? '');
        $port = (int)($input['port'] ?? 554); // Default to RTSP port

        if (empty($ip)) {
            jsonError('IP address required');
        }

        $connection = @fsockopen($ip, $port, $errno, $errstr, 2.0);
        if (is_resource($connection)) {
            fclose($connection);
            // Update camera status in DB if camera_id passed
            if (!empty($input['camera_id'])) {
                $upd = $db->prepare("UPDATE cameras SET status = 'Online', last_ping = NOW() WHERE id = ?");
                $upd->execute([$input['camera_id']]);
            }
            jsonResponse([
                'online' => true,
                'ip' => $ip,
                'port' => $port,
                'message' => "Successfully connected to $ip on port $port"
            ]);
        } else {
            if (!empty($input['camera_id'])) {
                $upd = $db->prepare("UPDATE cameras SET status = 'Offline', last_ping = NOW() WHERE id = ?");
                $upd->execute([$input['camera_id']]);
            }
            jsonResponse([
                'online' => false,
                'ip' => $ip,
                'port' => $port,
                'error' => $errstr ?: 'Connection timed out'
            ]);
        }

    } elseif ($action === 'save_pair') {
        $id = $input['id'] ?? null;
        $gateName = trim($input['gate_name'] ?? 'Main Gate');
        $inCamId = !empty($input['in_camera_id']) ? (int)$input['in_camera_id'] : null;
        $outCamId = !empty($input['out_camera_id']) ? (int)$input['out_camera_id'] : null;
        $desc = trim($input['description'] ?? '');

        if ($id) {
            $stmt = $db->prepare("
                UPDATE camera_pairs SET 
                    gate_name = ?, in_camera_id = ?, out_camera_id = ?, description = ?
                WHERE id = ?
            ");
            $stmt->execute([$gateName, $inCamId, $outCamId, $desc, $id]);
            jsonResponse(['id' => $id], 200, 'Gate pair updated');
        } else {
            $stmt = $db->prepare("
                INSERT INTO camera_pairs (gate_name, in_camera_id, out_camera_id, description)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$gateName, $inCamId, $outCamId, $desc]);
            jsonResponse(['id' => $db->lastInsertId()], 201, 'Gate pair created');
        }

    } else {
        // Save camera
        $id = $input['id'] ?? null;
        $cameraName = trim($input['camera_name'] ?? '');
        $ip = trim($input['ip_address'] ?? '');
        $rtspUrl = trim($input['rtsp_url'] ?? '');
        $httpUrl = trim($input['http_url'] ?? '');
        $role = strtoupper($input['camera_role'] ?? 'IN');
        $gateName = trim($input['gate_name'] ?? 'Main Gate');
        $doorLocation = trim($input['door_location'] ?? 'Reception');
        $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;

        if (empty($cameraName) || empty($ip)) {
            jsonError('Camera Name and IP Address are required');
        }

        if (!in_array($role, ['IN', 'OUT'])) {
            $role = 'IN';
        }

        if (empty($rtspUrl)) {
            $rtspUrl = "rtsp://admin:admin123@$ip:554/live/ch0";
        }

        // Test connectivity quickly
        $sock = @fsockopen($ip, 554, $errno, $errstr, 1.0);
        $status = is_resource($sock) ? 'Online' : 'Offline';
        if (is_resource($sock)) fclose($sock);

        if ($id) {
            $stmt = $db->prepare("
                UPDATE cameras SET 
                    camera_name = :name, ip_address = :ip, rtsp_url = :rtsp, http_url = :http,
                    camera_role = :role, gate_name = :gate, door_location = :door,
                    status = :status, is_active = :active
                WHERE id = :id
            ");
            $stmt->execute([
                ':name' => $cameraName, ':ip' => $ip, ':rtsp' => $rtspUrl, ':http' => $httpUrl,
                ':role' => $role, ':gate' => $gateName, ':door' => $doorLocation,
                ':status' => $status, ':active' => $isActive, ':id' => $id
            ]);
            jsonResponse(['id' => $id, 'status' => $status], 200, 'Camera updated successfully');
        } else {
            $stmt = $db->prepare("
                INSERT INTO cameras 
                (camera_name, ip_address, rtsp_url, http_url, camera_role, gate_name, door_location, status, is_active)
                VALUES 
                (:name, :ip, :rtsp, :http, :role, :gate, :door, :status, :active)
            ");
            $stmt->execute([
                ':name' => $cameraName, ':ip' => $ip, ':rtsp' => $rtspUrl, ':http' => $httpUrl,
                ':role' => $role, ':gate' => $gateName, ':door' => $doorLocation,
                ':status' => $status, ':active' => $isActive
            ]);
            jsonResponse(['id' => $db->lastInsertId(), 'status' => $status], 201, 'Camera added successfully');
        }
    }

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    $type = $_GET['type'] ?? 'camera';

    if (!$id) {
        jsonError('ID is required');
    }

    if ($type === 'pair') {
        $db->prepare("DELETE FROM camera_pairs WHERE id = ?")->execute([$id]);
        jsonResponse(['id' => $id], 200, 'Gate pair deleted');
    } else {
        $db->prepare("DELETE FROM cameras WHERE id = ?")->execute([$id]);
        jsonResponse(['id' => $id], 200, 'Camera deleted');
    }
} else {
    jsonError('Method not allowed', 405);
}

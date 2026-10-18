<?php
// backend/api/settings.php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->query("SELECT setting_key, setting_value, group_name, description FROM system_settings");
    $rawSettings = $stmt->fetchAll();
    
    $settingsMap = [];
    foreach ($rawSettings as $row) {
        $settingsMap[$row['setting_key']] = $row['setting_value'];
    }
    if (!isset($settingsMap['show_live_popup'])) {
        $settingsMap['show_live_popup'] = '1';
    }

    // Available Timezones for GCC and India
    $timezones = [
        ['value' => 'Asia/Bahrain', 'label' => 'Bahrain (UTC+3)'],
        ['value' => 'Asia/Dubai', 'label' => 'United Arab Emirates / Dubai (UTC+4)'],
        ['value' => 'Asia/Riyadh', 'label' => 'Saudi Arabia / Riyadh (UTC+3)'],
        ['value' => 'Asia/Qatar', 'label' => 'Qatar / Doha (UTC+3)'],
        ['value' => 'Asia/Kuwait', 'label' => 'Kuwait (UTC+3)'],
        ['value' => 'Asia/Muscat', 'label' => 'Oman / Muscat (UTC+4)'],
        ['value' => 'Asia/Kolkata', 'label' => 'India Standard Time / IST (UTC+5:30)']
    ];

    // Available Currencies
    $currencies = [
        ['code' => 'BHD', 'symbol' => 'BD', 'name' => 'Bahraini Dinar'],
        ['code' => 'SAR', 'symbol' => 'SR', 'name' => 'Saudi Riyal'],
        ['code' => 'AED', 'symbol' => 'AED', 'name' => 'UAE Dirham'],
        ['code' => 'QAR', 'symbol' => 'QR', 'name' => 'Qatari Riyal'],
        ['code' => 'KWD', 'symbol' => 'KD', 'name' => 'Kuwaiti Dinar'],
        ['code' => 'OMR', 'symbol' => 'OMR', 'name' => 'Omani Rial'],
        ['code' => 'INR', 'symbol' => '₹', 'name' => 'Indian Rupee'],
        ['code' => 'USD', 'symbol' => '$', 'name' => 'US Dollar']
    ];

    jsonResponse([
        'settings' => $settingsMap,
        'options' => [
            'timezones' => $timezones,
            'currencies' => $currencies,
            'date_formats' => ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'D MMM YYYY'],
            'time_formats' => ['12h', '24h'],
            'app_modes' => ['office', 'school']
        ]
    ]);

} elseif ($method === 'POST') {
    $input = getJsonInput();
    
    // Handle logo file upload if provided
    if (isset($_FILES['logo_file']) && $_FILES['logo_file']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../../logos/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        $filename = 'custom_logo_' . time() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '', basename($_FILES['logo_file']['name']));
        $targetFile = $uploadDir . $filename;
        if (move_uploaded_file($_FILES['logo_file']['tmp_name'], $targetFile)) {
            $input['logo_url'] = '/logos/' . $filename;
        }
    }

    $allowedKeys = [
        'company_name', 'logo_url', 'footer_text', 'timezone', 'currency',
        'date_format', 'time_format', 'theme_header_color', 'theme_menu_color',
        'theme_mode', 'app_mode', 'face_match_threshold', 'punch_cooldown_seconds',
        'hr_sync_enabled', 'hr_db_host', 'hr_db_name', 'hr_db_user', 'hr_db_pass',
        'show_live_popup'
    ];

    $stmt = $db->prepare("
        INSERT INTO system_settings (setting_key, setting_value) 
        VALUES (:key, :val) 
        ON DUPLICATE KEY UPDATE setting_value = :val2
    ");

    $updated = [];
    foreach ($input as $k => $v) {
        if (in_array($k, $allowedKeys)) {
            $valStr = is_bool($v) ? ($v ? '1' : '0') : (string)$v;
            $stmt->execute([
                ':key' => $k,
                ':val' => $valStr,
                ':val2' => $valStr
            ]);
            $updated[$k] = $valStr;
        }
    }

    jsonResponse($updated, 200, 'Settings saved successfully');
} else {
    jsonError('Method not allowed', 405);
}

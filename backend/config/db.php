<?php
// backend/config/db.php

class Database {
    private static $host = '127.0.0.1';
    private static $db_name = 'cctv_attendance';
    private static $username = 'root';
    private static $password = 'S@nds1@b';
    private static $port = 3306;
    private static $conn = null;
    private static $hr_conn = null;

    public static function getConnection() {
        if (self::$conn === null) {
            try {
                $dsn = "mysql:host=" . self::$host . ";port=" . self::$port . ";dbname=" . self::$db_name . ";charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ];
                self::$conn = new PDO($dsn, self::$username, self::$password, $options);
                
                // Fetch timezone from system_settings if available
                try {
                    $stmt = self::$conn->query("SELECT setting_value FROM system_settings WHERE setting_key = 'timezone' LIMIT 1");
                    $tz = $stmt->fetchColumn();
                    if ($tz && in_array($tz, timezone_identifiers_list())) {
                        date_default_timezone_set($tz);
                    } else {
                        date_default_timezone_set('Asia/Bahrain');
                    }
                } catch (Exception $e) {
                    date_default_timezone_set('Asia/Bahrain');
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed: ' . $e->getMessage()
                ]);
                exit();
            }
        }
        return self::$conn;
    }

    public static function getHrConnection() {
        if (self::$hr_conn === null) {
            try {
                // Fetch HR DB settings from system_settings
                $conn = self::getConnection();
                $stmt = $conn->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('hr_db_host', 'hr_db_name', 'hr_db_user', 'hr_db_pass')");
                $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

                $hrHost = $settings['hr_db_host'] ?? '127.0.0.1';
                $hrDb   = $settings['hr_db_name'] ?? 'hr_solution_db';
                $hrUser = $settings['hr_db_user'] ?? 'root';
                $hrPass = $settings['hr_db_pass'] ?? 'S@nds1@b';

                $dsn = "mysql:host=" . $hrHost . ";port=" . self::$port . ";dbname=" . $hrDb . ";charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ];
                self::$hr_conn = new PDO($dsn, $hrUser, $hrPass, $options);
            } catch (PDOException $e) {
                return null;
            }
        }
        return self::$hr_conn;
    }
}

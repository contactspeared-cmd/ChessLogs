<?php
/**
 * Health check endpoint for ChessLogs API
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/db.php';

try {
    $pdo = getDbConnection();
    $stmt = $pdo->query('SELECT COUNT(*) as user_count FROM profiles');
    $count = $stmt->fetch()['user_count'] ?? 0;

    jsonResponse([
        'status' => 'ok',
        'backend' => 'php',
        'php_version' => PHP_VERSION,
        'database' => 'connected',
        'profiles_count' => (int)$count,
        'timestamp' => date('c'),
    ]);
} catch (\Exception $e) {
    jsonError('Health check failed: ' . $e->getMessage(), 500);
}

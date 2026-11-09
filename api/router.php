<?php
/**
 * PHP Built-in Server Router for ChessLogs API
 * Usage: php -S 127.0.0.1:8000 api/router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// If the file exists directly in public or root, serve it directly
if ($uri !== '/' && file_exists(__DIR__ . '/..' . $uri)) {
    return false;
}

// Strip trailing slash
$cleanUri = rtrim($uri, '/');

// Route mapping
$routes = [
    '/api/health'       => __DIR__ . '/health.php',
    '/api/health.php'   => __DIR__ . '/health.php',
    '/api/auth'         => __DIR__ . '/auth.php',
    '/api/auth.php'     => __DIR__ . '/auth.php',
    '/api/courses'      => __DIR__ . '/courses.php',
    '/api/courses.php'  => __DIR__ . '/courses.php',
    '/api/assignments'  => __DIR__ . '/assignments.php',
    '/api/assignments.php' => __DIR__ . '/assignments.php',
    '/api/games'        => __DIR__ . '/games.php',
    '/api/games.php'    => __DIR__ . '/games.php',
    '/api/students'     => __DIR__ . '/students.php',
    '/api/students.php' => __DIR__ . '/students.php',
];

if (isset($routes[$cleanUri])) {
    require $routes[$cleanUri];
    exit;
}

// Prefix matching for `/api/...`
if (strpos($cleanUri, '/api/') === 0) {
    $script = substr($cleanUri, 5); // remove '/api/'
    $script = preg_replace('/\.php$/', '', $script);
    $target = __DIR__ . '/' . $script . '.php';
    if (file_exists($target)) {
        require $target;
        exit;
    }
}

// Fallback 404
http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'error' => 'Endpoint not found',
    'uri' => $uri,
]);
exit;

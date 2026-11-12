<?php


require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];




if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM profiles WHERE role = "student" ORDER BY created_at DESC');
    $students = $stmt->fetchAll();

    $result = [];
    foreach ($students as $student) {
        $sid = $student['id'];


        $stmtGames = $pdo->prepare('SELECT id, played_at, result, time_class, white_username, black_username
            FROM games
            WHERE student_id = ?
            ORDER BY played_at DESC');
        $stmtGames->execute([$sid]);
        $games = $stmtGames->fetchAll();


        $stmtAssign = $pdo->prepare('SELECT course_id, progress FROM course_assignments WHERE student_id = ?');
        $stmtAssign->execute([$sid]);
        $assignments = $stmtAssign->fetchAll();
        $normalizedAssign = [];
        foreach ($assignments as $a) {
            $normalizedAssign[] = [
                'course_id' => $a['course_id'],
                'progress' => normalizeProgress($a['progress']),
            ];
        }

        $safe = sanitizeProfile($student);
        $safe['games'] = $games;
        $safe['assignments'] = $normalizedAssign;
        $result[] = $safe;
    }

    jsonResponse($result);
}




if ($method === 'PUT' || ($method === 'POST' && isset($_GET['id']))) {
    $id = $_GET['id'] ?? '';
    $body = getJsonBody();
    if (!$id && isset($body['id'])) {
        $id = $body['id'];
    }

    if (!$id) {
        jsonError('Student ID is required.', 400);
    }

    $fields = [];
    $params = [];
    $allowed = [
        'first_name', 'middle_initial', 'last_name', 'suffix',
        'date_of_birth', 'display_name', 'avatar_url', 'chesscom_username',
        'bio', 'elo_rating', 'min_student_elo', 'coaching_standards', 'current_elo'
    ];

    foreach ($allowed as $k) {
        if (array_key_exists($k, $body)) {
            $fields[] = "`$k` = ?";
            $params[] = $body[$k];
        }
    }

    if (isset($body['firstName']) && !array_key_exists('first_name', $body)) {
        $fields[] = '`first_name` = ?';
        $params[] = $body['firstName'];
    }
    if (isset($body['middleInitial']) && !array_key_exists('middle_initial', $body)) {
        $fields[] = '`middle_initial` = ?';
        $params[] = $body['middleInitial'];
    }
    if (isset($body['lastName']) && !array_key_exists('last_name', $body)) {
        $fields[] = '`last_name` = ?';
        $params[] = $body['lastName'];
    }
    if (isset($body['chesscomUsername']) && !array_key_exists('chesscom_username', $body)) {
        $fields[] = '`chesscom_username` = ?';
        $params[] = $body['chesscomUsername'];
    }

    if (!empty($fields)) {
        $fields[] = '`updated_at` = NOW()';
        $params[] = $id;

        $sql = 'UPDATE profiles SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    $fetch = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
    $fetch->execute([$id]);
    $updated = $fetch->fetch();
    jsonResponse(sanitizeProfile($updated));
}




if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) {
        $body = getJsonBody();
        $id = $body['id'] ?? '';
    }

    if (!$id) {
        jsonError('Student ID is required for deletion.', 400);
    }


    $stmt = $pdo->prepare('DELETE FROM profiles WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(['success' => true, 'id' => $id]);
}

jsonError("Method '{$method}' not allowed on students endpoint.", 405);

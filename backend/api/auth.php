<?php


require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$body = getJsonBody();
if (!$action && isset($body['action'])) {
    $action = $body['action'];
}




if ($action === 'login' && $method === 'POST') {
    $email = strtolower(trim($body['email'] ?? ''));
    $password = (string)($body['password'] ?? '');

    if (!$email || !$password) {
        jsonError('Email and password are required.', 400);
    }

    $stmt = $pdo->prepare('SELECT * FROM profiles WHERE LOWER(email) = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !verifyPasswordHash($password, $user['password_hash'], $user['salt'] ?? '')) {
        jsonError('Invalid email or password. Please verify your credentials.', 401);
    }

    $safeProfile = sanitizeProfile($user);
    $token = bin2hex(random_bytes(24));

    jsonResponse([
        'user' => [
            'id' => $safeProfile['id'],
            'email' => $safeProfile['email'],
        ],
        'profile' => $safeProfile,
        'token' => $token,
    ]);
}




if ($action === 'signup' && $method === 'POST') {
    $firstName = trim($body['firstName'] ?? $body['first_name'] ?? '');
    $middleInitial = trim($body['middleInitial'] ?? $body['middle_initial'] ?? '');
    $lastName = trim($body['lastName'] ?? $body['last_name'] ?? '');
    $suffix = trim($body['suffix'] ?? '');
    $dateOfBirth = trim($body['dateOfBirth'] ?? $body['date_of_birth'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $password = (string)($body['password'] ?? '');
    $confirmPassword = isset($body['confirmPassword']) ? (string)$body['confirmPassword'] : null;
    $chesscomUsername = trim($body['chesscomUsername'] ?? $body['chesscom_username'] ?? '');
    $role = 'student';

    if (!$firstName || !$lastName) {
        jsonError('First name and last name are required.', 400);
    }
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('A valid email address is required.', 400);
    }
    if (!$password || strlen($password) < 6) {
        jsonError('Password must be at least 6 characters long.', 400);
    }
    if ($confirmPassword !== null && $password !== $confirmPassword) {
        jsonError('Passwords do not match. Please re-enter.', 400);
    }


    $check = $pdo->prepare('SELECT id FROM profiles WHERE LOWER(email) = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        jsonError('An account with this email already exists. Please sign in.', 409);
    }

    $id = 'usr-' . generateUuid();
    $salt = bin2hex(random_bytes(8));
    $hashedPassword = hashUserPassword($password);
    $displayName = formatCompositeName($firstName, $middleInitial, $lastName, $suffix);

    $sql = 'INSERT INTO profiles (
        id, email, password_hash, salt, role,
        first_name, middle_initial, last_name, suffix, date_of_birth,
        display_name, chesscom_username, bio, avatar_url, current_elo,
        created_at, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        NOW(), NOW()
    )';

    $avatarUrl = $body['avatar_url'] ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    $bio = $body['bio'] ?? '';
    $elo = isset($body['current_elo']) ? (int)$body['current_elo'] : 1200;
    $dob = $dateOfBirth ? date('Y-m-d', strtotime($dateOfBirth)) : null;

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $id,
        $email,
        $hashedPassword,
        $salt,
        $role,
        $firstName,
        $middleInitial,
        $lastName,
        $suffix,
        $dob,
        $displayName,
        $chesscomUsername,
        $bio,
        $avatarUrl,
        $elo,
    ]);

    $fetch = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
    $fetch->execute([$id]);
    $created = $fetch->fetch();
    $safeProfile = sanitizeProfile($created);
    $token = bin2hex(random_bytes(24));

    jsonResponse([
        'user' => [
            'id' => $safeProfile['id'],
            'email' => $safeProfile['email'],
        ],
        'profile' => $safeProfile,
        'token' => $token,
    ], 201);
}




if ($action === 'chesscom' && $method === 'POST') {
    $username = trim($body['username'] ?? $body['chesscom_username'] ?? '');
    if (!$username) {
        jsonError('Chess.com username is required.', 400);
    }
    $cleanUsername = strtolower($username);


    $stmt = $pdo->prepare('SELECT * FROM profiles WHERE LOWER(chesscom_username) = ? LIMIT 1');
    $stmt->execute([$cleanUsername]);
    $user = $stmt->fetch();

    if ($user) {
        $safeProfile = sanitizeProfile($user);
        jsonResponse([
            'user' => [
                'id' => $safeProfile['id'],
                'email' => $safeProfile['email'] ?? "{$cleanUsername}@chess.com",
            ],
            'profile' => $safeProfile,
            'token' => bin2hex(random_bytes(24)),
        ]);
    }


    $id = 'chesscom-' . $cleanUsername;
    $displayName = $body['displayName'] ?? $username;
    $avatarUrl = $body['avatarUrl'] ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    $bio = $body['bio'] ?? "Chess.com player {$username}";
    $email = "{$cleanUsername}@chess.com";

    $insert = $pdo->prepare('INSERT INTO profiles (
        id, email, role, display_name, chesscom_username, bio, avatar_url, current_elo, created_at, updated_at
    ) VALUES (
        ?, ?, "student", ?, ?, ?, ?, 1200, NOW(), NOW()
    ) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), avatar_url = VALUES(avatar_url)');
    $insert->execute([$id, $email, $displayName, $cleanUsername, $bio, $avatarUrl]);

    $fetch = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
    $fetch->execute([$id]);
    $created = $fetch->fetch();
    $safeProfile = sanitizeProfile($created);

    jsonResponse([
        'user' => [
            'id' => $safeProfile['id'],
            'email' => $safeProfile['email'],
        ],
        'profile' => $safeProfile,
        'token' => bin2hex(random_bytes(24)),
    ]);
}




if ($action === 'profile') {
    if ($method === 'GET') {
        $id = $_GET['id'] ?? '';
        if (!$id) {
            jsonError('User ID is required.', 400);
        }
        $stmt = $pdo->prepare('SELECT * FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonError('User profile not found.', 404);
        }
        jsonResponse(sanitizeProfile($row));
    }

    if ($method === 'PUT' || $method === 'POST') {
        $id = $body['id'] ?? $_GET['id'] ?? '';
        if (!$id) {
            jsonError('User ID is required to update profile.', 400);
        }

        $fields = [];
        $params = [];

        $allowedKeys = [
            'first_name', 'middle_initial', 'last_name', 'suffix',
            'date_of_birth', 'display_name', 'avatar_url', 'chesscom_username',
            'bio', 'elo_rating', 'min_student_elo', 'coaching_standards', 'current_elo',
            'role'
        ];

        foreach ($allowedKeys as $k) {
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
        if (isset($body['displayName']) && !array_key_exists('display_name', $body)) {
            $fields[] = '`display_name` = ?';
            $params[] = $body['displayName'];
        }
        if (isset($body['dateOfBirth']) && !array_key_exists('date_of_birth', $body)) {
            $fields[] = '`date_of_birth` = ?';
            $params[] = $body['dateOfBirth'];
        }
        if (isset($body['chesscomUsername']) && !array_key_exists('chesscom_username', $body)) {
            $fields[] = '`chesscom_username` = ?';
            $params[] = $body['chesscomUsername'];
        }
        if (isset($body['avatarUrl']) && !array_key_exists('avatar_url', $body)) {
            $fields[] = '`avatar_url` = ?';
            $params[] = $body['avatarUrl'];
        }
        if (isset($body['minStudentElo']) && !array_key_exists('min_student_elo', $body)) {
            $fields[] = '`min_student_elo` = ?';
            $params[] = (int)$body['minStudentElo'];
        }
        if (isset($body['coachingStandards']) && !array_key_exists('coaching_standards', $body)) {
            $fields[] = '`coaching_standards` = ?';
            $params[] = $body['coachingStandards'];
        }
        if (isset($body['currentElo']) && !array_key_exists('current_elo', $body)) {
            $fields[] = '`current_elo` = ?';
            $params[] = (int)$body['currentElo'];
        }

        if (empty($fields)) {
            jsonError('No valid profile fields provided for update.', 400);
        }

        $fields[] = '`updated_at` = NOW()';
        $params[] = $id;

        $sql = 'UPDATE profiles SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $fetch = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
        $fetch->execute([$id]);
        $updated = $fetch->fetch();
        jsonResponse(sanitizeProfile($updated));
    }
}




if ($action === 'me' && $method === 'GET') {
    $id = $_GET['id'] ?? '';
    if (!$id) {
        jsonError('Session query requires user ID.', 400);
    }
    $stmt = $pdo->prepare('SELECT * FROM profiles WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        jsonError('Profile not found', 404);
    }
    jsonResponse([
        'user' => [
            'id' => $row['id'],
            'email' => $row['email'],
        ],
        'profile' => sanitizeProfile($row),
    ]);
}

jsonError("Unsupported auth action: '{$action}' with method '{$method}'.", 400);

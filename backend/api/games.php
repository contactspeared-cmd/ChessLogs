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

function normalizeGameReview($review) {
    if (!$review) return null;
    $raw = $review['move_classifications'] ?? '[]';
    $classifications = [];
    if (is_string($raw)) {
        $decoded = json_decode($raw, true);
        $classifications = is_array($decoded) ? $decoded : [];
    } elseif (is_array($raw)) {
        $classifications = $raw;
    }

    return [
        'id' => $review['id'],
        'game_id' => $review['game_id'],
        'engine_version' => $review['engine_version'],
        'move_classifications' => $classifications,
        'accuracy_white' => $review['accuracy_white'] !== null ? (float)$review['accuracy_white'] : null,
        'accuracy_black' => $review['accuracy_black'] !== null ? (float)$review['accuracy_black'] : null,
        'created_at' => $review['created_at'],
    ];
}




if ($method === 'GET') {
    $gameId = $_GET['id'] ?? null;
    $studentId = $_GET['student_id'] ?? null;

    if ($gameId) {
        $stmt = $pdo->prepare('SELECT g.*,
            r.id as review_id, r.engine_version, r.move_classifications,
            r.accuracy_white, r.accuracy_black, r.created_at as review_created_at
            FROM games g
            LEFT JOIN game_reviews r ON g.id = r.game_id
            WHERE g.id = ? OR g.chesscom_game_id = ?
            LIMIT 1');
        $stmt->execute([$gameId, $gameId]);
        $row = $stmt->fetch();

        if (!$row) {
            jsonError('Game not found', 404);
        }

        $review = null;
        if (!empty($row['review_id'])) {
            $review = normalizeGameReview([
                'id' => $row['review_id'],
                'game_id' => $row['id'],
                'engine_version' => $row['engine_version'],
                'move_classifications' => $row['move_classifications'],
                'accuracy_white' => $row['accuracy_white'],
                'accuracy_black' => $row['accuracy_black'],
                'created_at' => $row['review_created_at'],
            ]);
        }
        unset($row['review_id'], $row['engine_version'], $row['move_classifications'], $row['accuracy_white'], $row['accuracy_black'], $row['review_created_at']);
        $row['review'] = $review;

        jsonResponse($row);
    }

    if ($studentId) {
        $stmt = $pdo->prepare('SELECT g.*,
            r.id as review_id, r.engine_version, r.move_classifications,
            r.accuracy_white, r.accuracy_black, r.created_at as review_created_at
            FROM games g
            LEFT JOIN game_reviews r ON g.id = r.game_id
            WHERE g.student_id = ?
            ORDER BY g.played_at DESC, g.synced_at DESC');
        $stmt->execute([$studentId]);
        $rows = $stmt->fetchAll();

        $games = [];
        foreach ($rows as $row) {
            $review = null;
            if (!empty($row['review_id'])) {
                $review = normalizeGameReview([
                    'id' => $row['review_id'],
                    'game_id' => $row['id'],
                    'engine_version' => $row['engine_version'],
                    'move_classifications' => $row['move_classifications'],
                    'accuracy_white' => $row['accuracy_white'],
                    'accuracy_black' => $row['accuracy_black'],
                    'created_at' => $row['review_created_at'],
                ]);
            }
            unset($row['review_id'], $row['engine_version'], $row['move_classifications'], $row['accuracy_white'], $row['accuracy_black'], $row['review_created_at']);
            $row['review'] = $review;
            $games[] = $row;
        }

        jsonResponse($games);
    }

    jsonError('Either id or student_id query parameter is required.', 400);
}




if ($action === 'review' && $method === 'POST') {
    $gameId = $body['game_id'] ?? '';
    $reviewData = $body['review'] ?? $body;

    if (!$gameId) {
        jsonError('game_id is required for saving review.', 400);
    }

    $engineVersion = $reviewData['engine_version'] ?? 'Stockfish 18 NNUE';
    $moveClass = $reviewData['move_classifications'] ?? [];
    $classJson = is_string($moveClass) ? $moveClass : json_encode($moveClass, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $accWhite = isset($reviewData['accuracy_white']) ? (float)$reviewData['accuracy_white'] : null;
    $accBlack = isset($reviewData['accuracy_black']) ? (float)$reviewData['accuracy_black'] : null;

    $reviewId = 'review-' . generateUuid();

    $stmt = $pdo->prepare('INSERT INTO game_reviews (
        id, game_id, engine_version, move_classifications, accuracy_white, accuracy_black, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
        engine_version = VALUES(engine_version),
        move_classifications = VALUES(move_classifications),
        accuracy_white = VALUES(accuracy_white),
        accuracy_black = VALUES(accuracy_black)');

    $stmt->execute([$reviewId, $gameId, $engineVersion, $classJson, $accWhite, $accBlack]);

    $fetch = $pdo->prepare('SELECT * FROM game_reviews WHERE game_id = ?');
    $fetch->execute([$gameId]);
    $saved = $fetch->fetch();

    jsonResponse(normalizeGameReview($saved));
}


function upsertSingleGame($pdo, $stmt, $g, $fallbackStudentId = null) {
    $studentId = $g['student_id'] ?? $fallbackStudentId;
    if (!$studentId) return null;

    $gameId = !empty($g['id']) ? $g['id'] : ('game-' . generateUuid());
    $chesscomId = $g['chesscom_game_id'] ?? null;
    $pgn = $g['pgn'] ?? '';
    $timeClass = $g['time_class'] ?? null;
    $result = $g['result'] ?? null;
    $white = $g['white_username'] ?? null;
    $black = $g['black_username'] ?? null;
    $wRating = isset($g['white_rating']) ? (int)$g['white_rating'] : null;
    $bRating = isset($g['black_rating']) ? (int)$g['black_rating'] : null;
    $url = $g['url'] ?? null;
    $playedAt = !empty($g['played_at']) ? date('Y-m-d H:i:s', strtotime($g['played_at'])) : null;
    $eco = $g['eco'] ?? null;
    $opening = $g['opening'] ?? null;
    $variation = $g['variation'] ?? null;

    $stmt->execute([
        $gameId, $studentId, $chesscomId, $pgn, $timeClass,
        $result, $white, $black, $wRating, $bRating,
        $url, $playedAt, $eco, $opening, $variation
    ]);

    return $gameId;
}




if ($action === 'upsert' && $method === 'POST') {
    $games = $body['games'] ?? (isset($body[0]) ? $body : []);
    if (!is_array($games) || empty($games)) {
        jsonResponse([]);
    }

    $sql = 'INSERT INTO games (
        id, student_id, chesscom_game_id, pgn, time_class,
        result, white_username, black_username, white_rating, black_rating,
        url, played_at, eco, opening, variation, synced_at
    ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, NOW()
    ) ON DUPLICATE KEY UPDATE
        pgn = VALUES(pgn),
        time_class = VALUES(time_class),
        result = VALUES(result),
        white_username = VALUES(white_username),
        black_username = VALUES(black_username),
        white_rating = VALUES(white_rating),
        black_rating = VALUES(black_rating),
        url = VALUES(url),
        played_at = VALUES(played_at),
        eco = VALUES(eco),
        opening = VALUES(opening),
        variation = VALUES(variation),
        synced_at = NOW()';

    $stmt = $pdo->prepare($sql);
    $pdo->beginTransaction();

    try {
        $savedIds = [];
        foreach ($games as $g) {
            $id = upsertSingleGame($pdo, $stmt, $g);
            if ($id) $savedIds[] = $id;
        }
        $pdo->commit();
        jsonResponse(['success' => true, 'count' => count($savedIds)]);
    } catch (\Exception $e) {
        $pdo->rollBack();
        jsonError('Failed to upsert games: ' . $e->getMessage(), 500);
    }
}




if ($action === 'replace_synced' && $method === 'POST') {
    $studentId = $body['student_id'] ?? '';
    $games = $body['games'] ?? [];

    if (!$studentId) {
        jsonError('student_id is required.', 400);
    }

    $pdo->beginTransaction();
    try {

        $delStmt = $pdo->prepare('DELETE FROM games WHERE student_id = ?
            AND (chesscom_game_id IS NULL OR (chesscom_game_id NOT LIKE "custom-%" AND id NOT LIKE "pgn-%"))');
        $delStmt->execute([$studentId]);

        if (is_array($games) && !empty($games)) {
            $sql = 'INSERT INTO games (
                id, student_id, chesscom_game_id, pgn, time_class,
                result, white_username, black_username, white_rating, black_rating,
                url, played_at, eco, opening, variation, synced_at
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, NOW()
            ) ON DUPLICATE KEY UPDATE
                pgn = VALUES(pgn),
                time_class = VALUES(time_class),
                result = VALUES(result),
                white_username = VALUES(white_username),
                black_username = VALUES(black_username),
                white_rating = VALUES(white_rating),
                black_rating = VALUES(black_rating),
                url = VALUES(url),
                played_at = VALUES(played_at),
                eco = VALUES(eco),
                opening = VALUES(opening),
                variation = VALUES(variation),
                synced_at = NOW()';

            $stmt = $pdo->prepare($sql);
            foreach ($games as $g) {
                upsertSingleGame($pdo, $stmt, $g, $studentId);
            }
        }

        $pdo->commit();
        jsonResponse(['success' => true, 'synced_count' => count($games)]);
    } catch (\Exception $e) {
        $pdo->rollBack();
        jsonError('Failed to replace synced games: ' . $e->getMessage(), 500);
    }
}

jsonError("Unsupported games action: '{$action}'.", 400);

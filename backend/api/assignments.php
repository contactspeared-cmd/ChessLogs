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




if ($method === 'GET') {
    $courseId = $_GET['course_id'] ?? '';
    $studentId = $_GET['student_id'] ?? '';

    if (!$courseId || !$studentId) {
        jsonError('Both course_id and student_id are required.', 400);
    }

    $stmt = $pdo->prepare('SELECT * FROM course_assignments WHERE course_id = ? AND student_id = ? LIMIT 1');
    $stmt->execute([$courseId, $studentId]);
    $assign = $stmt->fetch();

    if (!$assign) {
        jsonResponse([
            'cards' => new stdClass(),
            'progress' => normalizeProgress(null)
        ]);
    }

    $prog = normalizeProgress($assign['progress']);
    jsonResponse([
        'cards' => $prog['trainer']['cards'] ?? new stdClass(),
        'progress' => $prog,
    ]);
}




if ($action === 'assign' && $method === 'POST') {
    $courseId = $body['course_id'] ?? '';
    $studentIds = $body['student_ids'] ?? [];

    if (!$courseId) {
        jsonError('course_id is required.', 400);
    }
    if (!is_array($studentIds) || empty($studentIds)) {
        jsonError('student_ids array is required and must contain at least one ID.', 400);
    }

    $uniqueStudentIds = array_values(array_unique(array_filter($studentIds)));

    $pdo->beginTransaction();
    try {

        $stmtExisting = $pdo->prepare('SELECT id, student_id FROM course_assignments WHERE course_id = ?');
        $stmtExisting->execute([$courseId]);
        $existing = $stmtExisting->fetchAll();

        $existingStudentIds = array_column($existing, 'student_id');
        $toRemove = [];
        foreach ($existing as $row) {
            if (!in_array($row['student_id'], $uniqueStudentIds, true)) {
                $toRemove[] = $row['id'];
            }
        }


        if (!empty($toRemove)) {
            $inPlaceholders = implode(',', array_fill(0, count($toRemove), '?'));
            $stmtDel = $pdo->prepare("DELETE FROM course_assignments WHERE id IN ($inPlaceholders)");
            $stmtDel->execute($toRemove);
        }


        $toAdd = array_diff($uniqueStudentIds, $existingStudentIds);
        if (!empty($toAdd)) {
            $stmtInsert = $pdo->prepare('INSERT INTO course_assignments (
                id, course_id, student_id, assigned_at, status, progress_pct, progress
            ) VALUES (?, ?, ?, NOW(), "active", 0, ?)');

            $defaultProgress = json_encode([
                'completed_chapter_ids' => [],
                'read_chapter_ids' => [],
                'trained_chapter_ids' => [],
                'preferred_study_mode' => null,
                'trainer' => ['cards' => new stdClass()]
            ]);

            foreach ($toAdd as $sid) {
                $assignId = 'assign-' . generateUuid();
                $stmtInsert->execute([$assignId, $courseId, $sid, $defaultProgress]);
            }
        }

        $pdo->commit();
        jsonResponse(['success' => true, 'course_id' => $courseId, 'assigned_count' => count($uniqueStudentIds)]);
    } catch (\Exception $e) {
        $pdo->rollBack();
        jsonError('Failed to update course assignments: ' . $e->getMessage(), 500);
    }
}




if ($action === 'progress' && $method === 'POST') {
    $courseId = $body['course_id'] ?? '';
    $studentId = $body['student_id'] ?? '';
    $chapterId = $body['chapter_id'] ?? '';
    $mode = $body['mode'] ?? 'video';

    if (!$courseId || !$studentId || !$chapterId) {
        jsonError('course_id, student_id, and chapter_id are required.', 400);
    }

    $stmt = $pdo->prepare('SELECT id, progress FROM course_assignments WHERE course_id = ? AND student_id = ? LIMIT 1');
    $stmt->execute([$courseId, $studentId]);
    $assign = $stmt->fetch();

    $prog = normalizeProgress($assign ? $assign['progress'] : null);

    if ($mode === 'read') {
        if (!in_array($chapterId, $prog['read_chapter_ids'], true)) {
            $prog['read_chapter_ids'][] = $chapterId;
        }
    } elseif ($mode === 'trained') {
        if (!in_array($chapterId, $prog['trained_chapter_ids'], true)) {
            $prog['trained_chapter_ids'][] = $chapterId;
        }
        if (!in_array($chapterId, $prog['completed_chapter_ids'], true)) {
            $prog['completed_chapter_ids'][] = $chapterId;
        }
    } else {

        if (!in_array($chapterId, $prog['completed_chapter_ids'], true)) {
            $prog['completed_chapter_ids'][] = $chapterId;
        }
    }

    $encodedProgress = json_encode($prog, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($assign) {
        $update = $pdo->prepare('UPDATE course_assignments SET progress = ?, last_accessed_at = NOW() WHERE id = ?');
        $update->execute([$encodedProgress, $assign['id']]);
    } else {

        $assignId = 'assign-' . generateUuid();
        $insert = $pdo->prepare('INSERT INTO course_assignments (
            id, course_id, student_id, assigned_at, status, progress_pct, last_accessed_at, progress
        ) VALUES (?, ?, ?, NOW(), "active", 0, NOW(), ?)');
        $insert->execute([$assignId, $courseId, $studentId, $encodedProgress]);
    }

    jsonResponse(['success' => true, 'progress' => $prog]);
}




if ($action === 'study_mode' && $method === 'POST') {
    $courseId = $body['course_id'] ?? '';
    $studentId = $body['student_id'] ?? '';
    $mode = $body['mode'] ?? '';

    if (!$courseId || !$studentId || !in_array($mode, ['trainer', 'read'], true)) {
        jsonError('Valid course_id, student_id, and mode (trainer|read) are required.', 400);
    }

    $stmt = $pdo->prepare('SELECT id, progress FROM course_assignments WHERE course_id = ? AND student_id = ? LIMIT 1');
    $stmt->execute([$courseId, $studentId]);
    $assign = $stmt->fetch();

    $prog = normalizeProgress($assign ? $assign['progress'] : null);
    $prog['preferred_study_mode'] = $mode;
    $encoded = json_encode($prog, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($assign) {
        $update = $pdo->prepare('UPDATE course_assignments SET progress = ?, last_accessed_at = NOW() WHERE id = ?');
        $update->execute([$encoded, $assign['id']]);
    } else {
        $assignId = 'assign-' . generateUuid();
        $insert = $pdo->prepare('INSERT INTO course_assignments (
            id, course_id, student_id, assigned_at, status, progress_pct, last_accessed_at, progress
        ) VALUES (?, ?, ?, NOW(), "active", 0, NOW(), ?)');
        $insert->execute([$assignId, $courseId, $studentId, $encoded]);
    }

    jsonResponse(['success' => true, 'preferred_study_mode' => $mode]);
}




if ($action === 'trainer_progress' && $method === 'POST') {
    $courseId = $body['course_id'] ?? '';
    $studentId = $body['student_id'] ?? '';
    $trainerProgress = $body['trainerProgress'] ?? [];

    if (!$courseId || !$studentId) {
        jsonError('course_id and student_id are required.', 400);
    }

    $stmt = $pdo->prepare('SELECT id, progress FROM course_assignments WHERE course_id = ? AND student_id = ? LIMIT 1');
    $stmt->execute([$courseId, $studentId]);
    $assign = $stmt->fetch();

    $prog = normalizeProgress($assign ? $assign['progress'] : null);
    $prog['trainer'] = $trainerProgress;
    $encoded = json_encode($prog, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($assign) {
        $update = $pdo->prepare('UPDATE course_assignments SET progress = ?, last_accessed_at = NOW() WHERE id = ?');
        $update->execute([$encoded, $assign['id']]);
    } else {
        $assignId = 'assign-' . generateUuid();
        $insert = $pdo->prepare('INSERT INTO course_assignments (
            id, course_id, student_id, assigned_at, status, progress_pct, last_accessed_at, progress
        ) VALUES (?, ?, ?, NOW(), "active", 0, NOW(), ?)');
        $insert->execute([$assignId, $courseId, $studentId, $encoded]);
    }

    jsonResponse(['success' => true, 'trainer' => $prog['trainer']]);
}

jsonError("Unsupported assignments action: '{$action}'.", 400);

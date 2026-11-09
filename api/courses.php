<?php
/**
 * Courses API Endpoint for ChessLogs
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Helper to fetch chapters for a course
function getCourseChapters($pdo, $courseId) {
    $stmt = $pdo->prepare('SELECT * FROM course_chapters WHERE course_id = ? ORDER BY order_index ASC, id ASC');
    $stmt->execute([$courseId]);
    $chapters = $stmt->fetchAll();
    return array_map('normalizeChapter', $chapters);
}

// -----------------------------------------------------------------------------
// GET COURSES
// -----------------------------------------------------------------------------
if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    $studentId = $_GET['student_id'] ?? null;
    $role = $_GET['role'] ?? null;

    // Single Course
    if ($id) {
        $stmt = $pdo->prepare('SELECT * FROM courses WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $course = $stmt->fetch();

        if (!$course) {
            jsonError('Course not found.', 404);
        }

        $course['chapters'] = getCourseChapters($pdo, $id);
        $course['min_elo'] = (int)($course['min_elo'] ?? 0);
        $course['max_elo'] = (int)($course['max_elo'] ?? 3000);
        $course['is_published'] = (bool)($course['is_published'] ?? 1);

        if ($studentId) {
            $stmtAssign = $pdo->prepare('SELECT progress FROM course_assignments WHERE course_id = ? AND student_id = ? LIMIT 1');
            $stmtAssign->execute([$id, $studentId]);
            $assign = $stmtAssign->fetch();
            $course['progress'] = normalizeProgress($assign ? $assign['progress'] : null);
        } else {
            $course['progress'] = normalizeProgress(null);
        }

        jsonResponse($course);
    }

    // List of courses for student (only assigned courses)
    if ($studentId && $role !== 'admin') {
        $sql = 'SELECT c.*, ca.progress as assignment_progress, ca.assigned_at,
                       p.display_name as coach_name, p.avatar_url as coach_avatar, p.role as coach_role, p.chesscom_username as coach_chesscom
                FROM courses c
                INNER JOIN course_assignments ca ON c.id = ca.course_id
                LEFT JOIN profiles p ON c.created_by = p.id
                WHERE ca.student_id = ?
                ORDER BY c.created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$studentId]);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $row) {
            $progressRaw = $row['assignment_progress'];
            unset($row['assignment_progress']);
            $row['chapters'] = getCourseChapters($pdo, $row['id']);
            $row['progress'] = normalizeProgress($progressRaw);
            $row['min_elo'] = (int)($row['min_elo'] ?? 0);
            $row['max_elo'] = (int)($row['max_elo'] ?? 3000);
            $row['is_published'] = (bool)($row['is_published'] ?? 1);
            $result[] = $row;
        }

        jsonResponse($result);
    }

    // List of all courses (admin view or public catalog)
    $stmt = $pdo->query('SELECT c.*, p.display_name as coach_name, p.avatar_url as coach_avatar, p.role as coach_role, p.chesscom_username as coach_chesscom
                         FROM courses c
                         LEFT JOIN profiles p ON c.created_by = p.id
                         ORDER BY c.created_at DESC');
    $courses = $stmt->fetchAll();

    $result = [];
    foreach ($courses as $c) {
        $c['chapters'] = getCourseChapters($pdo, $c['id']);
        $c['progress'] = normalizeProgress(null);
        $c['min_elo'] = (int)($c['min_elo'] ?? 0);
        $c['max_elo'] = (int)($c['max_elo'] ?? 3000);
        $c['is_published'] = (bool)($c['is_published'] ?? 1);
        $result[] = $c;
    }

    jsonResponse($result);
}

// -----------------------------------------------------------------------------
// CREATE OR UPDATE COURSE (with Chapters)
// -----------------------------------------------------------------------------
if ($method === 'POST') {
    $body = getJsonBody();
    $courseData = $body['course'] ?? $body;
    $chaptersData = $body['chapters'] ?? ($courseData['chapters'] ?? []);

    $title = trim($courseData['title'] ?? '');
    if (!$title) {
        jsonError('Course title is required.', 400);
    }

    $courseId = !empty($courseData['id']) ? $courseData['id'] : ('course-' . generateUuid());
    $desc = $courseData['description'] ?? '';
    $type = in_array($courseData['type'] ?? '', ['video', 'walkthrough']) ? $courseData['type'] : 'walkthrough';
    $orientation = $courseData['orientation'] ?? 'white';
    $trainedSide = $courseData['trained_side'] ?? 'white';
    $createdBy = $courseData['created_by'] ?? null;
    $minElo = isset($courseData['min_elo']) ? (int)$courseData['min_elo'] : 0;
    $maxElo = isset($courseData['max_elo']) ? (int)$courseData['max_elo'] : 3000;
    $isPublished = isset($courseData['is_published']) ? ($courseData['is_published'] ? 1 : 0) : 1;

    $pdo->beginTransaction();

    try {
        // Upsert Course
        $sqlCourse = 'INSERT INTO courses (
            id, title, description, type, created_by,
            orientation, trained_side, min_elo, max_elo, is_published,
            created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            NOW(), NOW()
        ) ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            type = VALUES(type),
            orientation = VALUES(orientation),
            trained_side = VALUES(trained_side),
            min_elo = VALUES(min_elo),
            max_elo = VALUES(max_elo),
            is_published = VALUES(is_published),
            updated_at = NOW()';

        $stmtCourse = $pdo->prepare($sqlCourse);
        $stmtCourse->execute([
            $courseId, $title, $desc, $type, $createdBy,
            $orientation, $trainedSide, $minElo, $maxElo, $isPublished
        ]);

        // Replace chapters if provided
        if (is_array($chaptersData)) {
            $delChapters = $pdo->prepare('DELETE FROM course_chapters WHERE course_id = ?');
            $delChapters->execute([$courseId]);

            $insChapter = $pdo->prepare('INSERT INTO course_chapters (
                id, course_id, order_index, title, description,
                video_url, pgn, orientation, trained_side, annotations, created_at
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, NOW()
            )');

            foreach ($chaptersData as $idx => $ch) {
                $chapId = !empty($ch['id']) ? $ch['id'] : ('chap-' . generateUuid());
                $chapTitle = trim($ch['title'] ?? "Chapter " . ($idx + 1));
                $chapDesc = trim($ch['description'] ?? '');
                $videoUrl = $ch['video_url'] ?? null;
                $pgn = $ch['pgn'] ?? null;
                $chapOrientation = $ch['orientation'] ?? $orientation;
                $chapTrainedSide = $ch['trained_side'] ?? $trainedSide;

                $rawAnn = $ch['annotations'] ?? [];
                if (is_string($rawAnn)) {
                    $decoded = json_decode($rawAnn, true);
                    $annJson = json_encode($decoded ?: [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                } else {
                    $annJson = json_encode($rawAnn, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                }

                $insChapter->execute([
                    $chapId,
                    $courseId,
                    $idx + 1,
                    $chapTitle,
                    $chapDesc,
                    $videoUrl,
                    $pgn,
                    $chapOrientation,
                    $chapTrainedSide,
                    $annJson,
                ]);
            }
        }

        $pdo->commit();

        // Fetch saved course
        $stmtFetch = $pdo->prepare('SELECT * FROM courses WHERE id = ?');
        $stmtFetch->execute([$courseId]);
        $saved = $stmtFetch->fetch();
        $saved['chapters'] = getCourseChapters($pdo, $courseId);
        $saved['progress'] = normalizeProgress(null);

        jsonResponse($saved);
    } catch (\Exception $e) {
        $pdo->rollBack();
        jsonError('Failed to save course: ' . $e->getMessage(), 500);
    }
}

// -----------------------------------------------------------------------------
// DELETE COURSE
// -----------------------------------------------------------------------------
if ($method === 'DELETE') {
    $courseId = $_GET['id'] ?? '';
    if (!$courseId) {
        $body = getJsonBody();
        $courseId = $body['id'] ?? '';
    }

    if (!$courseId) {
        jsonError('Course ID is required for deletion.', 400);
    }

    $stmt = $pdo->prepare('DELETE FROM courses WHERE id = ?');
    $stmt->execute([$courseId]);

    jsonResponse(['success' => true, 'id' => $courseId]);
}

jsonError("Method '{$method}' not allowed on courses endpoint.", 405);

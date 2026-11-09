<?php
/**
 * Helper utilities for ChessLogs Backend
 */

function generateUuid() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function formatCompositeName($firstName, $middleInitial, $lastName, $suffix) {
    $parts = [];
    $f = trim($firstName ?? '');
    $m = trim($middleInitial ?? '');
    $l = trim($lastName ?? '');
    $s = trim($suffix ?? '');

    if ($f !== '') $parts[] = $f;
    if ($m !== '') {
        $miClean = rtrim($m, '.');
        $parts[] = $miClean . '.';
    }
    if ($l !== '') $parts[] = $l;
    if ($s !== '') $parts[] = $s;

    return count($parts) > 0 ? implode(' ', $parts) : 'Chess Player';
}

function verifyPasswordHash($inputPassword, $storedHash, $storedSalt = '') {
    if (!$storedHash) {
        return false;
    }
    // 1. Check PHP standard password_verify (e.g. bcrypt / argon2)
    if (password_verify($inputPassword, $storedHash)) {
        return true;
    }
    // 2. Check legacy SHA-256 hash with salt (e.g. salt:password)
    if ($storedSalt) {
        $sha = hash('sha256', "{$storedSalt}:{$inputPassword}");
        if (hash_equals($storedHash, $sha)) {
            return true;
        }
    }
    // 3. Check plain SHA-256 without salt
    if (hash_equals($storedHash, hash('sha256', $inputPassword))) {
        return true;
    }
    // 4. Fallback plain equality for testing
    if (hash_equals($storedHash, $inputPassword)) {
        return true;
    }
    return false;
}

function hashUserPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

function normalizeChapter($chapter) {
    if (!$chapter) return null;
    $rawAnn = $chapter['annotations'] ?? '[]';
    $annotations = [];
    $desc = $chapter['description'] ?? '';

    if (is_string($rawAnn)) {
        $decoded = json_decode($rawAnn, true);
        if (is_array($decoded)) {
            if (isset($decoded['moments']) && is_array($decoded['moments'])) {
                $annotations = $decoded['moments'];
                if (!$desc && !empty($decoded['description'])) {
                    $desc = $decoded['description'];
                }
            } else {
                $annotations = $decoded;
            }
        }
    } elseif (is_array($rawAnn)) {
        if (isset($rawAnn['moments']) && is_array($rawAnn['moments'])) {
            $annotations = $rawAnn['moments'];
            if (!$desc && !empty($rawAnn['description'])) {
                $desc = $rawAnn['description'];
            }
        } else {
            $annotations = $rawAnn;
        }
    }

    return [
        'id' => $chapter['id'],
        'course_id' => $chapter['course_id'],
        'order_index' => (int)($chapter['order_index'] ?? 0),
        'title' => $chapter['title'] ?? '',
        'description' => $desc ?: '',
        'video_url' => $chapter['video_url'] ?? '',
        'pgn' => $chapter['pgn'] ?? '',
        'orientation' => $chapter['orientation'] ?? 'white',
        'trained_side' => $chapter['trained_side'] ?? 'white',
        'annotations' => $annotations,
        'created_at' => $chapter['created_at'] ?? null,
    ];
}

function normalizeProgress($rawProgress) {
    $progress = [];
    if (is_string($rawProgress)) {
        $decoded = json_decode($rawProgress, true);
        if (is_array($decoded)) {
            $progress = $decoded;
        }
    } elseif (is_array($rawProgress)) {
        $progress = $rawProgress;
    }

    return [
        'completed_chapter_ids' => isset($progress['completed_chapter_ids']) && is_array($progress['completed_chapter_ids']) ? array_values(array_unique($progress['completed_chapter_ids'])) : [],
        'read_chapter_ids' => isset($progress['read_chapter_ids']) && is_array($progress['read_chapter_ids']) ? array_values(array_unique($progress['read_chapter_ids'])) : [],
        'trained_chapter_ids' => isset($progress['trained_chapter_ids']) && is_array($progress['trained_chapter_ids']) ? array_values(array_unique($progress['trained_chapter_ids'])) : [],
        'preferred_study_mode' => in_array($progress['preferred_study_mode'] ?? '', ['read', 'trainer'], true) ? $progress['preferred_study_mode'] : null,
        'trainer' => isset($progress['trainer']) && is_array($progress['trainer']) ? $progress['trainer'] : ['cards' => new stdClass()],
    ];
}

function sanitizeProfile($profile) {
    if (!$profile) return null;
    unset($profile['password_hash']);
    unset($profile['salt']);
    return $profile;
}

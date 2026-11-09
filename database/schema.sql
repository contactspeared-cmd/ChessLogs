-- ==============================================================================
-- ChessLogs: MySQL Database Schema
-- Compatible with MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- Character set: utf8mb4, collation: utf8mb4_unicode_ci
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `chesslogs`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `chesslogs`;

-- Disable foreign key checks during schema construction
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Users, Coaches, Admins, Students)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) NULL,
  `password_hash` VARCHAR(255) NULL,
  `salt` VARCHAR(64) NULL,
  `role` ENUM('admin', 'coach', 'student') NOT NULL DEFAULT 'student',
  `first_name` VARCHAR(100) NULL,
  `middle_initial` VARCHAR(10) NULL,
  `last_name` VARCHAR(100) NULL,
  `suffix` VARCHAR(20) NULL,
  `date_of_birth` DATE NULL,
  `display_name` VARCHAR(255) NULL,
  `avatar_url` TEXT NULL,
  `chesscom_username` VARCHAR(100) NULL,
  `bio` TEXT NULL,
  `elo_rating` INT NULL,
  `min_student_elo` INT NOT NULL DEFAULT 0,
  `coaching_standards` TEXT NULL,
  `current_elo` INT NOT NULL DEFAULT 1200,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profiles_email` (`email`),
  KEY `idx_profiles_role` (`role`),
  KEY `idx_profiles_chesscom` (`chesscom_username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. COURSES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `courses` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `type` ENUM('video', 'walkthrough') NOT NULL DEFAULT 'walkthrough',
  `created_by` VARCHAR(64) NULL,
  `orientation` VARCHAR(10) NOT NULL DEFAULT 'white',
  `trained_side` VARCHAR(10) NOT NULL DEFAULT 'white',
  `min_elo` INT NOT NULL DEFAULT 0,
  `max_elo` INT NOT NULL DEFAULT 3000,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_courses_created_by` (`created_by`),
  KEY `idx_courses_published` (`is_published`),
  CONSTRAINT `fk_courses_created_by` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. COURSE CHAPTERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `course_chapters` (
  `id` VARCHAR(64) NOT NULL,
  `course_id` VARCHAR(64) NOT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `video_url` TEXT NULL,
  `pgn` LONGTEXT NULL,
  `orientation` VARCHAR(10) NOT NULL DEFAULT 'white',
  `trained_side` VARCHAR(10) NOT NULL DEFAULT 'white',
  `annotations` LONGTEXT NULL COMMENT 'JSON array or object storing key moments and notes',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chapters_course` (`course_id`, `order_index`),
  CONSTRAINT `fk_chapters_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. COURSE ASSIGNMENTS & STUDENT PROGRESS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `course_assignments` (
  `id` VARCHAR(64) NOT NULL,
  `course_id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('active', 'paused', 'completed', 'dropped') NOT NULL DEFAULT 'active',
  `progress_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `last_accessed_at` DATETIME NULL,
  `progress` LONGTEXT NOT NULL COMMENT 'JSON payload with completed, read, trained chapters and trainer SRS map',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_course_assignments` (`course_id`, `student_id`),
  KEY `idx_assignments_student` (`student_id`),
  CONSTRAINT `fk_assignments_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignments_student` FOREIGN KEY (`student_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. GAMES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `games` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `chesscom_game_id` VARCHAR(100) NULL,
  `pgn` LONGTEXT NOT NULL,
  `time_class` VARCHAR(50) NULL,
  `result` VARCHAR(50) NULL,
  `white_username` VARCHAR(100) NULL,
  `black_username` VARCHAR(100) NULL,
  `white_rating` INT NULL,
  `black_rating` INT NULL,
  `url` TEXT NULL,
  `played_at` DATETIME NULL,
  `synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `eco` VARCHAR(20) NULL,
  `opening` VARCHAR(255) NULL,
  `variation` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_chesscom_game` (`student_id`, `chesscom_game_id`),
  KEY `idx_games_student` (`student_id`, `played_at`),
  CONSTRAINT `fk_games_student` FOREIGN KEY (`student_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. GAME REVIEWS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `game_reviews` (
  `id` VARCHAR(64) NOT NULL,
  `game_id` VARCHAR(64) NOT NULL,
  `engine_version` VARCHAR(100) NOT NULL DEFAULT 'Stockfish 18 NNUE',
  `move_classifications` LONGTEXT NOT NULL COMMENT 'JSON array of move evaluations',
  `accuracy_white` DECIMAL(5,2) NULL,
  `accuracy_black` DECIMAL(5,2) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_game_reviews_game` (`game_id`),
  CONSTRAINT `fk_reviews_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. COACH CREDENTIALS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coach_credentials` (
  `id` VARCHAR(64) NOT NULL,
  `coach_id` VARCHAR(64) NOT NULL,
  `verified_by_admin_id` VARCHAR(64) NULL,
  `credential_type` VARCHAR(100) NOT NULL,
  `issuer` VARCHAR(255) NULL,
  `document_url` TEXT NULL,
  `verification_status` ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  `rejection_reason` TEXT NULL,
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_coach_credentials_coach` (`coach_id`),
  KEY `idx_coach_credentials_status` (`verification_status`),
  CONSTRAINT `fk_credentials_coach` FOREIGN KEY (`coach_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credentials_verifier` FOREIGN KEY (`verified_by_admin_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. STUDENT REQUIREMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_requirements` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `reviewed_by_admin_id` VARCHAR(64) NULL,
  `requirement_type` VARCHAR(100) NOT NULL,
  `document_url` TEXT NULL,
  `review_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `review_notes` TEXT NULL,
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_student_reqs_student` (`student_id`),
  KEY `idx_student_reqs_status` (`review_status`),
  CONSTRAINT `fk_requirements_student` FOREIGN KEY (`student_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_requirements_reviewer` FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. STUDENT COACH ENROLLMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_coach_enrollments` (
  `id` VARCHAR(64) NOT NULL,
  `student_id` VARCHAR(64) NOT NULL,
  `coach_id` VARCHAR(64) NOT NULL,
  `reviewed_by_admin_id` VARCHAR(64) NULL,
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `review_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `review_notes` TEXT NULL,
  `reviewed_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_coach` (`student_id`, `coach_id`),
  KEY `idx_enrollments_status` (`review_status`),
  CONSTRAINT `fk_enrollments_student` FOREIGN KEY (`student_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enrollments_coach` FOREIGN KEY (`coach_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enrollments_reviewer` FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. SEED INITIAL ACCOUNTS (Admin, Coach, Student)
-- Admin: satoalt33@gmail.com / ChessLogsAdmin2026!
-- Coach: coach@chesslogs.com / Coach2026!
-- Student: student@chesslogs.com / Student2026!
-- ------------------------------------------------------------------------------
INSERT INTO `profiles` (
  `id`, `email`, `password_hash`, `salt`, `role`,
  `first_name`, `middle_initial`, `last_name`, `suffix`, `date_of_birth`,
  `display_name`, `chesscom_username`, `bio`, `avatar_url`, `elo_rating`,
  `created_at`, `updated_at`
) VALUES 
(
  'admin-satoalt33-uuid',
  'satoalt33@gmail.com',
  '69226bbed9175da60bd820400f9711108f8bef8380233e5501b2656fa98b643b',
  'cl_salt_2026',
  'admin',
  'Site', '', 'Admin', '', '1990-01-01',
  'Admin', '',
  'ChessLogs System Administrator. Oversees platform governance, coaches, and students.',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  2400, NOW(), NOW()
),
(
  'coach-magnus-uuid',
  'coach@chesslogs.com',
  '3287a8b41fb8445aee716813b1962cc78ac059e561ee5244ce28df7fbe5b01b6',
  'cl_salt_2026',
  'coach',
  'Magnus', 'C', 'Carlsen', '', '1990-11-30',
  'Magnus C. Carlsen', 'magnuscarlsen',
  'FIDE Grandmaster, Senior Trainer, and former World Chess Champion.',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  2850, NOW(), NOW()
),
(
  'student-alex-uuid',
  'student@chesslogs.com',
  'c089c940e4e013446be55ee67c35c4c91fb703ca0fe3956608be470f0e05d3b0',
  'cl_salt_2026',
  'student',
  'Alex', 'M', 'Rivera', 'Jr.', '2004-06-15',
  'Alex M. Rivera Jr.', 'alexrivera_chess',
  'Aspiring tournament player aiming for 1800 Rapid.',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  1540, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `role` = VALUES(`role`);

SET FOREIGN_KEY_CHECKS = 1;

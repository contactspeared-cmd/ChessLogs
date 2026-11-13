import { api } from './api';
import {
  getAllAccounts,
  updateAccountRole,
  getCoachCredentials,
  submitCoachCredential,
  reviewCoachCredential,
  getStudentEnrollments,
  applyStudentEnrollment,
  reviewStudentEnrollment,
  getStudentRequirements,
  reviewStudentRequirement,
  deleteSiteAccount,
} from './authStore';
import { recordDeletion } from './auditStore';

const STORAGE_COURSES = 'chesslogs_courses';
const STORAGE_GAMES = 'chesslogs_games';
const STORAGE_ASSIGNMENTS = 'chesslogs_assignments';
const STORAGE_REVIEWS = 'chesslogs_reviews';
const STORAGE_STUDENTS = 'chesslogs_students';

let runtimeBackendEnabled = true;

export function unpackChapterAnnotations(raw) {
  if (Array.isArray(raw)) {
    return { description: '', moments: raw };
  }
  if (raw && typeof raw === 'object') {
    const moments = Array.isArray(raw.moments)
      ? raw.moments
      : Array.isArray(raw.items)
        ? raw.items
        : Array.isArray(raw.keyMoments)
          ? raw.keyMoments
          : [];
    return {
      description: typeof raw.description === 'string' ? raw.description : '',
      moments,
    };
  }
  return { description: '', moments: [] };
}

export function packChapterAnnotations(description, moments = []) {
  const desc = (description || '').trim();
  const list = Array.isArray(moments) ? moments : [];
  if (!desc) return list;
  return { description: desc, moments: list };
}

export function normalizeChapter(chapter) {
  if (!chapter) return chapter;
  const packed = unpackChapterAnnotations(chapter.annotations);
  return {
    ...chapter,
    orientation: chapter.orientation || 'white',
    trained_side: chapter.trained_side || 'white',
    description: chapter.description || packed.description || '',
    annotations: packed.moments,
  };
}

function normalizeChapters(chapters = []) {
  return [...chapters]
    .map(normalizeChapter)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
}

export function normalizeCourseProgress(progress) {
  const p = progress && typeof progress === 'object' ? progress : {};
  return {
    ...p,
    completed_chapter_ids: Array.isArray(p.completed_chapter_ids) ? p.completed_chapter_ids : [],
    read_chapter_ids: Array.isArray(p.read_chapter_ids) ? p.read_chapter_ids : [],
    trained_chapter_ids: Array.isArray(p.trained_chapter_ids) ? p.trained_chapter_ids : [],
    preferred_study_mode:
      p.preferred_study_mode === 'read' || p.preferred_study_mode === 'trainer'
        ? p.preferred_study_mode
        : null,
    trainer: p.trainer && typeof p.trainer === 'object' ? p.trainer : { cards: {} },
  };
}

const GAME_TRIM_LIMITS = [1000, 500, 200, 100, 50, 20, 10, 5, 1];

function isQuotaExceededError(err) {
  if (!err) return false;
  const name = err.name || '';
  const code = err.code || err.number || null;
  const msg = (err.message || '').toLowerCase();
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014 ||
    msg.includes('quota') ||
    msg.includes('exceeded')
  );
}

function minimalGame(game) {
  return {
    id: game.id,
    student_id: game.student_id,
    chesscom_game_id: game.chesscom_game_id,
    played_at: game.played_at,
    result: game.result,
    time_class: game.time_class,
    white_username: game.white_username,
    black_username: game.black_username,
  };
}

function stripLargeFields(game) {
  const copy = { ...game };
  delete copy.pgn;
  delete copy.moves;
  delete copy.analysis;
  delete copy.annotations;
  delete copy.engine_report;
  return copy;
}

function setGamesSafely(gamesArray) {
  try {
    localStorage.setItem(STORAGE_GAMES, JSON.stringify(gamesArray));
    return;
  } catch (err) {
    if (!isQuotaExceededError(err)) throw err;
    for (let limit of GAME_TRIM_LIMITS) {
      const trimmed = gamesArray.slice(0, Math.min(limit, gamesArray.length)).map(stripLargeFields);
      try {
        localStorage.setItem(STORAGE_GAMES, JSON.stringify(trimmed));
        return;
      } catch (e2) {
        if (!isQuotaExceededError(e2)) throw e2;
      }
    }

    try {
      const minimal = gamesArray.slice(0, 5).map(minimalGame);
      localStorage.setItem(STORAGE_GAMES, JSON.stringify(minimal));
    } catch (finalErr) {}
  }
}

export async function shouldUseSupabase() {
  return false;
}
export async function shouldUseBackend() {
  return runtimeBackendEnabled;
}

export const SEED_COURSES = [
  {
    id: 'course-sicilian-defense',
    title: 'Mastering the Sicilian Defense: Open Variations & Pawn Breaks',
    description:
      'Authored by GM Magnus Carlsen. Master key tactical pawn breaks, active piece placement, and dynamic counter-play in open Sicilian games.',
    type: 'walkthrough',
    category: 'openings',
    orientation: 'black',
    trained_side: 'black',
    min_elo: 1300,
    max_elo: 2400,
    created_by: 'coach-magnus-uuid',
    coach_name: 'Magnus C. Carlsen',
    coach_avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    coach_chesscom: 'magnuscarlsen',
    coach_role: 'coach',
    coach_title: 'GM / FIDE Senior Trainer',
    rating: 4.9,
    rating_count: 142,
    chapters: [
      {
        id: 'ch-sicilian-1',
        course_id: 'course-sicilian-defense',
        order_index: 0,
        title: 'Chapter 1: Sicilian Dragon & Yugoslav Setup',
        description: 'Key attacking lines and pawn levers against White castling queenside.',
        orientation: 'black',
        trained_side: 'black',
        pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O 8. Qd2 Nc6 *',
        annotations: [
          { ply: 16, keyMove: 'Nc6', comment: 'Solid knight development pressuring central squares.' },
        ],
      },
      {
        id: 'ch-sicilian-2',
        course_id: 'course-sicilian-defense',
        order_index: 1,
        title: 'Chapter 2: Najdorf 6. Be2 Classical Strategy',
        description: 'Navigating positional nuances and dynamic e5 thrusts.',
        orientation: 'black',
        trained_side: 'black',
        pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5 7. Nb3 Be7 *',
        annotations: [
          { ply: 12, keyMove: 'e5', comment: 'Signature thematic push establishing strong space in the center.' },
        ],
      },
    ],
  },
  {
    id: 'course-endgame-fundamentals',
    title: 'Rook & Pawn Endgames: Lucena & Philidor Mastery',
    description:
      'Authored by Coach Magnus Carlsen. Essential endgame techniques and building bridges every competitive tournament player must execute with absolute accuracy.',
    type: 'walkthrough',
    category: 'endgames',
    orientation: 'white',
    trained_side: 'white',
    min_elo: 1200,
    max_elo: 2200,
    created_by: 'coach-magnus-uuid',
    coach_name: 'Magnus C. Carlsen',
    coach_avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    coach_chesscom: 'magnuscarlsen',
    coach_role: 'coach',
    coach_title: 'GM / FIDE Senior Trainer',
    rating: 4.8,
    rating_count: 98,
    chapters: [
      {
        id: 'ch-endgame-1',
        course_id: 'course-endgame-fundamentals',
        order_index: 0,
        title: 'Chapter 1: The Lucena Technique & Bridge Building',
        description: 'Technique to convert 7th-rank rook and pawn endings.',
        orientation: 'white',
        trained_side: 'white',
        pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ *',
        annotations: [
          { ply: 12, keyMove: 'Bb4+', comment: 'Key tactical check to verify conversion principles.' },
        ],
      },
    ],
  },
  {
    id: 'course-italian-game',
    title: 'The Italian Game: Giuoco Piano & Evans Gambit',
    description:
      'Learn aggressive piece development, central dominance, and attacking plans with 1. e4 e5 2. Nf3 Nc6 3. Bc4.',
    type: 'walkthrough',
    category: 'openings',
    orientation: 'white',
    trained_side: 'white',
    min_elo: 1000,
    max_elo: 2000,
    created_by: 'coach-magnus-uuid',
    coach_name: 'Magnus C. Carlsen',
    coach_avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    coach_chesscom: 'magnuscarlsen',
    coach_role: 'coach',
    coach_title: 'GM / FIDE Senior Trainer',
    rating: 4.9,
    rating_count: 85,
    chapters: [
      {
        id: 'ch-italian-1',
        course_id: 'course-italian-game',
        order_index: 0,
        title: 'Chapter 1: Mainline Giuoco Pianissimo',
        description: 'Quiet positional development preparing central c3 and d4 expansion.',
        orientation: 'white',
        trained_side: 'white',
        pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O a6 7. a4 Ba7 *',
        annotations: [
          { ply: 8, keyMove: 'c3', comment: 'Paving the way for the ideal center.' },
        ],
      },
    ],
  },
  {
    id: 'course-tactical-patterns',
    title: 'Essential Tactical Calculation: Pins, Skewers & Forks',
    description:
      'Sharpen pattern recognition across the most common tournament tactical themes. Built for spaced repetition training.',
    type: 'walkthrough',
    category: 'tactics',
    orientation: 'white',
    trained_side: 'white',
    min_elo: 900,
    max_elo: 1900,
    created_by: 'coach-magnus-uuid',
    coach_name: 'Magnus C. Carlsen',
    coach_avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    coach_chesscom: 'magnuscarlsen',
    coach_role: 'coach',
    coach_title: 'GM / FIDE Senior Trainer',
    rating: 4.9,
    rating_count: 210,
    chapters: [
      {
        id: 'ch-tactics-1',
        course_id: 'course-tactical-patterns',
        order_index: 0,
        title: 'Chapter 1: Absolute and Relative Pins',
        description: 'Exploiting frozen pieces that shield higher value targets.',
        orientation: 'white',
        trained_side: 'white',
        pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 *',
        annotations: [
          { ply: 6, keyMove: 'Bb5', comment: 'The Spanish pin restricting black knight flexibility.' },
        ],
      },
    ],
  },
  {
    id: 'course-queens-gambit',
    title: 'Queen’s Gambit Declined: The Rock-Solid Repertoire',
    description:
      'A complete positional repertoire for Black against 1. d4. Master the Tartakower, Lasker, and Orthodox systems.',
    type: 'walkthrough',
    category: 'openings',
    orientation: 'black',
    trained_side: 'black',
    min_elo: 1200,
    max_elo: 2300,
    created_by: 'coach-magnus-uuid',
    coach_name: 'Magnus C. Carlsen',
    coach_avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    coach_chesscom: 'magnuscarlsen',
    coach_role: 'coach',
    coach_title: 'GM / FIDE Senior Trainer',
    rating: 4.7,
    rating_count: 67,
    chapters: [
      {
        id: 'ch-qgd-1',
        course_id: 'course-queens-gambit',
        order_index: 0,
        title: 'Chapter 1: The Classical Orthodox Setup',
        description: 'Stalwart defense establishing central pawn control.',
        orientation: 'black',
        trained_side: 'black',
        pgn: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7 *',
        annotations: [
          { ply: 4, keyMove: 'e6', comment: 'Firmly defending d5 and cementing the central pawn spine.' },
        ],
      },
    ],
  },
  {
    id: 'course-pawn-endgames',
    title: 'King & Pawn Endgames: Opposition, Triangulation & Key Squares',
    description:
      'Fundamental calculation rules: the square rule, distant opposition, and creating passed pawns.',
    type: 'walkthrough',
    category: 'endgames',
    orientation: 'white',
    trained_side: 'white',
    min_elo: 800,
    max_elo: 1800,
    created_by: 'coach-magnus-uuid',
    coach_name: 'Magnus C. Carlsen',
    coach_avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    coach_chesscom: 'magnuscarlsen',
    coach_role: 'coach',
    coach_title: 'GM / FIDE Senior Trainer',
    rating: 4.9,
    rating_count: 114,
    chapters: [
      {
        id: 'ch-pawn-1',
        course_id: 'course-pawn-endgames',
        order_index: 0,
        title: 'Chapter 1: The Direct Opposition Rule',
        description: 'Winning the key squares to usher your pawn into a queen.',
        orientation: 'white',
        trained_side: 'white',
        pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 *',
        annotations: [
          { ply: 8, keyMove: 'Nf6', comment: 'Focusing on king positioning before trading pieces.' },
        ],
      },
    ],
  },
];

export function enrichCourseWithCoach(course) {
  if (!course) return course;
  const accounts = getAllAccounts();
  const coach =
    accounts.find((a) => a.id === course.created_by) ||
    accounts.find((a) => a.role === 'coach') || {
      id: 'coach-magnus-uuid',
      display_name: 'Magnus C. Carlsen',
      avatar_url:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      chesscom_username: 'magnuscarlsen',
      role: 'coach',
    };

  return {
    ...course,
    category: course.category || 'openings',
    rating: course.rating || 4.8,
    rating_count: course.rating_count || 50,
    coach_name: course.coach_name || coach.display_name,
    coach_avatar: course.coach_avatar || coach.avatar_url,
    coach_role: course.coach_role || coach.role || 'coach',
    coach_chesscom: course.coach_chesscom || coach.chesscom_username,
    coach_title: course.coach_title || (coach.elo_rating >= 2700 ? 'Grandmaster' : 'Certified Coach'),
  };
}

export async function getCourses(userProfile) {
  try {
    const data = await api.courses.getAll(userProfile?.role || 'student', userProfile?.id);
    if (Array.isArray(data) && data.length > 0) {
      return data.map((course) => enrichCourseWithCoach({
        ...course,
        chapters: normalizeChapters(course.chapters),
        progress: normalizeCourseProgress(course.progress),
      }));
    }
  } catch (err) {}

  let rawCourses = JSON.parse(localStorage.getItem(STORAGE_COURSES) || '[]');
  let assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');

  if (rawCourses.length === 0) {
    rawCourses = [...SEED_COURSES];
    localStorage.setItem(STORAGE_COURSES, JSON.stringify(rawCourses));
  }

  if (userProfile?.id && assignments.filter((a) => a.student_id === userProfile.id).length === 0) {
    const initialStudentAssignments = rawCourses.slice(0, 2).map((c) => ({
      id: `assign-${c.id}-${userProfile.id}`,
      course_id: c.id,
      student_id: userProfile.id,
      assigned_at: '2026-02-01T10:00:00.000Z',
      assigned_by: c.created_by || 'coach-magnus-uuid',
      progress: {
        completed_chapter_ids: [c.chapters?.[0]?.id].filter(Boolean),
        read_chapter_ids: [c.chapters?.[0]?.id].filter(Boolean),
        trained_chapter_ids: [],
        trainer: { cards: {} },
      },
    }));
    assignments.push(...initialStudentAssignments);
    localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(assignments));
  }

  if (userProfile?.role === 'admin') {
    return rawCourses.map((c) => enrichCourseWithCoach({ ...c, chapters: normalizeChapters(c.chapters) }));
  }

  const studentAssignments = assignments.filter((a) => a.student_id === userProfile?.id);
  const assignedCourseIds = new Set(studentAssignments.map((a) => a.course_id));

  const list = rawCourses
    .filter((c) => assignedCourseIds.has(c.id))
    .map((c) => {
      const assign = studentAssignments.find((a) => a.course_id === c.id);
      return enrichCourseWithCoach({
        ...c,
        assigned_at: assign?.assigned_at,
        chapters: normalizeChapters(c.chapters),
        progress: normalizeCourseProgress(assign?.progress || { completed_chapter_ids: [] }),
      });
    });

  return list.length > 0
    ? list
    : rawCourses.slice(0, 2).map((c) =>
        enrichCourseWithCoach({
          ...c,
          chapters: normalizeChapters(c.chapters),
          progress: normalizeCourseProgress(null),
        })
      );
}

export function getAllMarketplaceCourses() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_COURSES) || '[]');
  const list = raw.length > 0 ? raw : SEED_COURSES;
  return list.map((c) => enrichCourseWithCoach({ ...c, chapters: normalizeChapters(c.chapters) }));
}

export function enrollInCourse(courseId, studentId) {
  if (!courseId || !studentId) return false;
  const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');
  const exists = assignments.find((a) => a.course_id === courseId && a.student_id === studentId);
  if (!exists) {
    assignments.push({
      id: `enroll-${courseId}-${studentId}`,
      course_id: courseId,
      student_id: studentId,
      assigned_at: new Date().toISOString(),
      assigned_by: 'self-enrolled',
      progress: {
        completed_chapter_ids: [],
        read_chapter_ids: [],
        trained_chapter_ids: [],
        trainer: { cards: {} },
      },
    });
    localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(assignments));
  }
  return true;
}

export function isStudentEnrolled(courseId, studentId) {
  if (!courseId || !studentId) return false;
  const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');
  return assignments.some((a) => a.course_id === courseId && a.student_id === studentId);
}

export async function getCourseById(courseId, studentId = null) {
  try {
    const data = await api.courses.getById(courseId, studentId);
    if (data && data.id) {
      data.chapters = normalizeChapters(data.chapters);
      data.progress = normalizeCourseProgress(data.progress);
      return enrichCourseWithCoach(data);
    }
  } catch (err) {}

  const courses = JSON.parse(localStorage.getItem(STORAGE_COURSES) || '[]');
  const course = (courses.length > 0 ? courses : SEED_COURSES).find((c) => c.id === courseId) || null;
  if (!course) return null;
  const normalized = { ...course, chapters: normalizeChapters(course.chapters) };
  if (studentId) {
    const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');
    const assign = assignments.find((a) => a.course_id === courseId && a.student_id === studentId);
    normalized.progress = normalizeCourseProgress(assign?.progress);
  }
  return enrichCourseWithCoach(normalized);
}

export async function saveCourse(courseData, chaptersData = []) {
  try {
    const saved = await api.courses.save(courseData, chaptersData);
    if (saved && saved.id) {
      saved.chapters = normalizeChapters(saved.chapters);
      saved.progress = normalizeCourseProgress(saved.progress);
      return saved;
    }
  } catch (err) {}

  const courses = JSON.parse(localStorage.getItem(STORAGE_COURSES) || '[]');
  let courseId = courseData.id;
  let updatedCourse;

  if (!courseId) {
    courseId = `course-${Date.now()}`;
    updatedCourse = {
      ...courseData,
      id: courseId,
      orientation: courseData.orientation || 'white',
      trained_side: courseData.trained_side || 'white',
      created_at: new Date().toISOString(),
      chapters: chaptersData.map((ch, idx) => ({
        ...ch,
        orientation: ch.orientation || courseData.orientation || 'white',
        trained_side: ch.trained_side || courseData.trained_side || 'white',
        id: ch.id || `chap-${Date.now()}-${idx}`,
        order_index: idx + 1,
      })),
    };
    courses.unshift(updatedCourse);
  } else {
    const idx = courses.findIndex((c) => c.id === courseId);
    updatedCourse = {
      ...courses[idx],
      ...courseData,
      orientation: courseData.orientation || courses[idx]?.orientation || 'white',
      trained_side: courseData.trained_side || courses[idx]?.trained_side || 'white',
      chapters: chaptersData.map((ch, i) => ({
        ...ch,
        orientation: ch.orientation || courseData.orientation || 'white',
        trained_side: ch.trained_side || courseData.trained_side || 'white',
        id: ch.id || `chap-${Date.now()}-${i}`,
        order_index: i + 1,
      })),
    };
    if (idx !== -1) {
      courses[idx] = updatedCourse;
    }
  }

  localStorage.setItem(STORAGE_COURSES, JSON.stringify(courses));
  return updatedCourse;
}

export async function deleteCourse(courseId, { reason = '', deletedBy = null } = {}) {
  const courses = JSON.parse(localStorage.getItem(STORAGE_COURSES) || '[]');
  const targetCourse = courses.find((c) => c.id === courseId);

  if (targetCourse) {
    recordDeletion({
      itemType: 'course',
      itemId: courseId,
      itemTitle: targetCourse.title || courseId,
      deletedBy,
      reason,
      payload: targetCourse,
    });
  }

  try {
    await api.courses.delete(courseId);
  } catch (err) {}

  const filtered = courses.filter((c) => c.id !== courseId);
  localStorage.setItem(STORAGE_COURSES, JSON.stringify(filtered));
  return true;
}

export async function assignCourseToStudents(courseId, studentIds) {
  const ids = [...new Set((studentIds || []).filter(Boolean))];
  if (ids.length < 1) {
    throw new Error('Select at least 1 student to assign this course.');
  }

  try {
    await api.assignments.assign(courseId, ids);
    return true;
  } catch (err) {}

  const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');
  const selected = new Set(ids);
  const kept = assignments.filter(
    (a) => a.course_id !== courseId || selected.has(a.student_id)
  );
  ids.forEach((sid) => {
    const existing = kept.find((a) => a.course_id === courseId && a.student_id === sid);
    if (!existing) {
      kept.push({
        id: `assign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        course_id: courseId,
        student_id: sid,
        assigned_at: new Date().toISOString(),
        progress: { completed_chapter_ids: [] },
      });
    }
  });
  localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(kept));
  return true;
}

function addUniqueId(list = [], id) {
  if (!id) return list;
  return list.includes(id) ? list : [...list, id];
}

export async function markChapterComplete(courseId, studentId, chapterId, mode = 'video') {
  try {
    await api.assignments.markProgress(courseId, studentId, chapterId, mode);
    return true;
  } catch (err) {}

  const applyProgress = (progress) => {
    const next = normalizeCourseProgress(progress);
    if (mode === 'read') {
      next.read_chapter_ids = addUniqueId(next.read_chapter_ids, chapterId);
    } else if (mode === 'trained') {
      next.trained_chapter_ids = addUniqueId(next.trained_chapter_ids, chapterId);
      next.completed_chapter_ids = addUniqueId(next.completed_chapter_ids, chapterId);
    } else {
      next.completed_chapter_ids = addUniqueId(next.completed_chapter_ids, chapterId);
    }
    return next;
  };

  const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');
  const matchIndex = assignments.findIndex(
    (a) => a.course_id === courseId && a.student_id === studentId
  );
  if (matchIndex >= 0) {
    assignments[matchIndex].progress = applyProgress(assignments[matchIndex].progress);
  } else {
    assignments.push({
      id: `local_assign_${Date.now()}`,
      course_id: courseId,
      student_id: studentId,
      progress: applyProgress({}),
    });
  }
  localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(assignments));
  return true;
}

export async function savePreferredStudyMode(courseId, studentId, mode) {
  if (!courseId || !studentId || (mode !== 'trainer' && mode !== 'read')) return false;

  try {
    await api.assignments.saveStudyMode(courseId, studentId, mode);
    return true;
  } catch (err) {}

  const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');
  const matchIndex = assignments.findIndex(
    (a) => a.course_id === courseId && a.student_id === studentId
  );
  if (matchIndex >= 0) {
    assignments[matchIndex].progress = {
      ...normalizeCourseProgress(assignments[matchIndex].progress),
      preferred_study_mode: mode,
    };
  } else {
    assignments.push({
      id: `local_assign_${Date.now()}`,
      course_id: courseId,
      student_id: studentId,
      progress: { preferred_study_mode: mode },
    });
  }
  localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(assignments));
  return true;
}

export async function saveTrainerProgress(courseId, studentId, trainerProgress) {
  if (!courseId || !studentId) return false;

  try {
    await api.assignments.saveTrainer(courseId, studentId, trainerProgress);
    return true;
  } catch (err) {}

  const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');
  let match = assignments.find((a) => a.course_id === courseId && a.student_id === studentId);
  if (!match) {
    match = {
      id: `assign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      course_id: courseId,
      student_id: studentId,
      assigned_at: new Date().toISOString(),
      progress: { completed_chapter_ids: [], trainer: trainerProgress },
    };
    assignments.push(match);
  } else {
    match.progress = {
      ...(match.progress || { completed_chapter_ids: [] }),
      trainer: trainerProgress,
    };
  }
  localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(assignments));
  return true;
}

export async function getTrainerProgress(courseId, studentId) {
  if (!courseId || !studentId) return { cards: {} };

  try {
    const data = await api.assignments.getTrainer(courseId, studentId);
    if (data && data.cards) {
      return data;
    }
  } catch (err) {}

  const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');
  const match = assignments.find((a) => a.course_id === courseId && a.student_id === studentId);
  return match?.progress?.trainer || { cards: {} };
}

export async function getGameById(gameId) {
  if (!gameId) return null;

  try {
    const game = await api.games.getById(gameId);
    if (game && game.id) return game;
  } catch (err) {}

  const games = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
  const reviews = JSON.parse(localStorage.getItem(STORAGE_REVIEWS) || '{}');

  const found = games.find((g) => g.id === gameId || g.chesscom_game_id === gameId);
  if (found) {
    return {
      ...found,
      review: found.review || reviews[found.id] || null,
    };
  }

  return null;
}

export async function getGamesForStudent(studentId) {
  if (!studentId) return [];

  try {
    const games = await api.games.getByStudent(studentId);
    if (Array.isArray(games)) return games;
  } catch (err) {}

  const games = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
  const reviews = JSON.parse(localStorage.getItem(STORAGE_REVIEWS) || '{}');

  return games
    .filter((g) => g.student_id === studentId)
    .map((g) => ({
      ...g,
      review: reviews[g.id] || null,
    }));
}

export async function upsertGames(formattedGames) {
  if (!formattedGames || formattedGames.length === 0) return [];

  try {
    await api.games.upsert(formattedGames);
    return formattedGames;
  } catch (err) {}

  const existingGames = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
  const newGames = [...existingGames];

  formattedGames.forEach((g) => {
    const idx = newGames.findIndex(
      (eg) => eg.student_id === g.student_id && eg.chesscom_game_id === g.chesscom_game_id
    );
    const withId = { ...g, id: g.id || `game-${g.chesscom_game_id}` };
    if (idx >= 0) {
      newGames[idx] = withId;
    } else {
      newGames.unshift(withId);
    }
  });

  try {
    setGamesSafely(newGames);
  } catch (err) {}
  return formattedGames;
}

function isManualImportedGame(game) {
  const externalId = String(game?.chesscom_game_id || '');
  const localId = String(game?.id || '');
  return externalId.startsWith('custom-') || localId.startsWith('pgn-');
}

export async function replaceSyncedChesscomGames(studentId, formattedGames = []) {
  if (!studentId) return [];

  try {
    await api.games.replaceSynced(studentId, formattedGames);
    return formattedGames;
  } catch (err) {}

  const existingGames = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
  const kept = existingGames.filter(
    (g) => g.student_id !== studentId || isManualImportedGame(g)
  );

  const incoming = (formattedGames || []).map((g) => ({
    ...g,
    id: g.id || `game-${g.chesscom_game_id}`,
    student_id: studentId,
  }));

  const next = [...incoming, ...kept];
  try {
    setGamesSafely(next);
  } catch (err) {}
  return incoming;
}

export async function saveGameReview(gameId, reviewData) {
  try {
    const saved = await api.games.saveReview(gameId, reviewData);
    if (saved && saved.id) return saved;
  } catch (err) {}

  const reviews = JSON.parse(localStorage.getItem(STORAGE_REVIEWS) || '{}');
  reviews[gameId] = {
    id: `review-${gameId}`,
    game_id: gameId,
    created_at: new Date().toISOString(),
    ...reviewData,
  };
  localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(reviews));
  return reviews[gameId];
}

export async function archiveGame(gameId, { reason = '', user = null } = {}) {
  const games = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
  const idx = games.findIndex((g) => g.id === gameId);
  if (idx === -1) return false;

  const targetGame = { ...games[idx] };
  targetGame.archived = true;
  targetGame.archived_at = new Date().toISOString();
  targetGame.archived_reason = (reason || '').trim() || 'Archived by player';

  recordDeletion({
    itemType: 'game',
    itemId: gameId,
    itemTitle: `${targetGame.white_username || 'White'} vs ${targetGame.black_username || 'Black'}`,
    deletedBy: user,
    reason,
    payload: targetGame,
  });

  games[idx] = targetGame;
  try {
    setGamesSafely(games);
  } catch (err) {}
  return targetGame;
}

export async function unarchiveGame(gameId) {
  const games = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
  const idx = games.findIndex((g) => g.id === gameId);
  if (idx === -1) return false;

  const targetGame = { ...games[idx] };
  targetGame.archived = false;
  delete targetGame.archived_at;
  delete targetGame.archived_reason;

  games[idx] = targetGame;
  try {
    setGamesSafely(games);
  } catch (err) {}
  return targetGame;
}

export async function getAllStudents() {
  try {
    const data = await api.students.getAll();
    if (Array.isArray(data)) return data;
  } catch (err) {}

  const localStudents = JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || '[]');
  const localGames = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
  const localAssignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');

  return localStudents
    .filter((p) => p.role === 'student' || !p.role)
    .map((p) => {
      const studentGames = localGames.filter(
        (g) =>
          g.student_id === p.id ||
          (p.chesscom_username && g.student_id === `chesscom-${p.chesscom_username.toLowerCase()}`)
      );
      const studentAssignments = localAssignments.filter((a) => a.student_id === p.id);
      return {
        ...p,
        games: studentGames,
        assignments: studentAssignments,
      };
    });
}

export async function deleteStudent(studentId, { reason = '', deletedBy = null } = {}) {
  const students = JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || '[]');
  const allAccounts = getAllAccounts();
  const targetStudent = students.find((s) => s.id === studentId) || allAccounts.find((a) => a.id === studentId);

  if (targetStudent) {
    recordDeletion({
      itemType: 'user',
      itemId: studentId,
      itemTitle: targetStudent.display_name || targetStudent.email || studentId,
      deletedBy,
      reason,
      payload: targetStudent,
    });
  }

  deleteSiteAccount(studentId);

  try {
    await api.students.delete(studentId);
  } catch (err) {}

  const filtered = students.filter(
    (s) =>
      s.id !== studentId &&
      (!s.chesscom_username || `chesscom-${s.chesscom_username.toLowerCase()}` !== studentId.toLowerCase())
  );
  localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(filtered));

  const games = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
  const filteredGames = games.filter(
    (g) => g.student_id !== studentId && (!studentId.startsWith('chesscom-') || g.student_id !== studentId)
  );
  try {
    setGamesSafely(filteredGames);
  } catch (err) {}
  return true;
}

export async function updateStudentProfile(studentId, profileData) {
  try {
    const updated = await api.auth.updateProfile(studentId, profileData);
    if (updated && updated.id) {
      const students = JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || '[]');
      const idx = students.findIndex((s) => s.id === studentId);
      if (idx >= 0) {
        students[idx] = { ...students[idx], ...updated };
        localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(students));
      }
      const { updateSiteAccount } = await import('./authStore');
      updateSiteAccount(studentId, updated);
      return updated;
    }
  } catch {
  }

  const students = JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || '[]');
  const idx = students.findIndex((s) => s.id === studentId);
  if (idx >= 0) {
    students[idx] = { ...students[idx], ...profileData };
    localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(students));
    return students[idx];
  }
  return null;
}

export async function getAllCoaches() {
  const accounts = getAllAccounts();
  return accounts.filter((a) => a.role === 'coach');
}

export {
  getAllAccounts,
  updateAccountRole,
  getCoachCredentials,
  submitCoachCredential,
  reviewCoachCredential,
  getStudentEnrollments,
  applyStudentEnrollment,
  reviewStudentEnrollment,
  getStudentRequirements,
  reviewStudentRequirement,
};


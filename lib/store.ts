'use client';

import { User, StudentProfile, Course, ChessGame, CourseChapter } from './types';
import { COACH_ADMIN, INITIAL_STUDENTS, INITIAL_COURSES, INITIAL_DEMO_GAMES } from './initialData';

const STORAGE_KEYS = {
  USER: 'chesslogs_active_user',
  STUDENTS: 'chesslogs_students_data',
  COURSES: 'chesslogs_courses_data',
  GAMES: 'chesslogs_games_data',
  STUDENT_PROGRESS: 'chesslogs_student_progress',
};

export function getStoredUser(): User {
  if (typeof window === 'undefined') return COACH_ADMIN;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return COACH_ADMIN;
}

export function setStoredUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function getStoredStudents(): StudentProfile[] {
  if (typeof window === 'undefined') return INITIAL_STUDENTS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_STUDENTS;
}

export function saveStudents(students: StudentProfile[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
}

export function getStoredCourses(): Course[] {
  if (typeof window === 'undefined') return INITIAL_COURSES;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COURSES);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_COURSES;
}

export function saveCourses(courses: Course[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
}

export function getStoredGames(): ChessGame[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_GAMES;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GAMES);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_DEMO_GAMES;
}

export function saveGames(games: ChessGame[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
}

export function updateGameCoachNotes(gameId: string, notes: string): void {
  const games = getStoredGames();
  const updated = games.map((g) => {
    if (g.id === gameId) {
      return { ...g, coachNotes: notes, coachReviewed: true };
    }
    return g;
  });
  saveGames(updated);
}

export function getCompletedChapters(courseId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.STUDENT_PROGRESS}_${courseId}`);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function toggleChapterComplete(courseId: string, chapterId: string): string[] {
  const current = getCompletedChapters(courseId);
  const exists = current.includes(chapterId);
  const updated = exists ? current.filter((id) => id !== chapterId) : [...current, chapterId];
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_KEYS.STUDENT_PROGRESS}_${courseId}`, JSON.stringify(updated));
  }
  return updated;
}

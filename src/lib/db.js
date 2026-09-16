import { supabase, isSupabaseConfigured } from './supabase';
import { DEMO_COURSES, DEMO_GAMES, DEMO_PROFILES } from '../data/initialData';

const STORAGE_COURSES = 'chesslogs_courses';
const STORAGE_GAMES = 'chesslogs_games';
const STORAGE_ASSIGNMENTS = 'chesslogs_assignments';
const STORAGE_REVIEWS = 'chesslogs_reviews';
const STORAGE_STUDENTS = 'chesslogs_students';

// Initialize mock storage if empty
function initMockStorage() {
  if (!localStorage.getItem(STORAGE_COURSES)) {
    localStorage.setItem(STORAGE_COURSES, JSON.stringify(DEMO_COURSES));
  }
  if (!localStorage.getItem(STORAGE_GAMES)) {
    localStorage.setItem(STORAGE_GAMES, JSON.stringify(DEMO_GAMES));
  }
  if (!localStorage.getItem(STORAGE_STUDENTS)) {
    localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(DEMO_PROFILES));
  }
  if (!localStorage.getItem(STORAGE_ASSIGNMENTS)) {
    // Assign courses to student Alex
    const assignments = [
      {
        id: 'assign-1',
        course_id: DEMO_COURSES[0].id,
        student_id: 'student-alex-uuid',
        assigned_at: new Date().toISOString(),
        progress: { completed_chapter_ids: [DEMO_COURSES[0].chapters[0].id] },
      },
      {
        id: 'assign-2',
        course_id: DEMO_COURSES[1].id,
        student_id: 'student-alex-uuid',
        assigned_at: new Date().toISOString(),
        progress: { completed_chapter_ids: [] },
      },
    ];
    localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(assignments));
  }
}

if (typeof window !== 'undefined') {
  initMockStorage();
}

export async function shouldUseSupabase() {
  if (!isSupabaseConfigured) return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return Boolean(session?.user);
  } catch {
    return false;
  }
}

/**
 * -----------------------------------------------------------------------------
 * COURSES & CHAPTERS
 * -----------------------------------------------------------------------------
 */

export async function getCourses(userProfile) {
  if (await shouldUseSupabase()) {
    if (userProfile?.role === 'admin') {
      const { data, error } = await supabase
        .from('courses')
        .select('*, chapters:course_chapters(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((course) => ({
        ...course,
        chapters: [...(course.chapters || [])].sort(
          (a, b) => (a.order_index || 0) - (b.order_index || 0)
        ),
      }));
    } else {
      // Student: only assigned courses
      const { data, error } = await supabase
        .from('courses')
        .select(
          '*, chapters:course_chapters(*), assignments:course_assignments!inner(student_id, progress)'
        )
        .eq('assignments.student_id', userProfile?.id);
      if (error) throw error;
      return (data || []).map((course) => ({
        ...course,
        chapters: [...(course.chapters || [])].sort(
          (a, b) => (a.order_index || 0) - (b.order_index || 0)
        ),
        progress: course.assignments?.[0]?.progress || { completed_chapter_ids: [] },
      }));
    }
  }

  // Mock
  const rawCourses = JSON.parse(localStorage.getItem(STORAGE_COURSES) || '[]');
  const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');

  if (userProfile?.role === 'admin') {
    return rawCourses;
  }

  // Filter for student
  const studentAssignments = assignments.filter((a) => a.student_id === userProfile?.id);
  const assignedCourseIds = new Set(studentAssignments.map((a) => a.course_id));

  return rawCourses
    .filter((c) => assignedCourseIds.has(c.id))
    .map((c) => {
      const assign = studentAssignments.find((a) => a.course_id === c.id);
      return {
        ...c,
        progress: assign?.progress || { completed_chapter_ids: [] },
      };
    });
}

export async function getCourseById(courseId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('courses')
      .select('*, chapters:course_chapters(*)')
      .eq('id', courseId)
      .single();
    if (error) throw error;
    if (data?.chapters) {
      data.chapters.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
    return data;
  }

  const courses = JSON.parse(localStorage.getItem(STORAGE_COURSES) || '[]');
  return courses.find((c) => c.id === courseId) || null;
}

export async function saveCourse(courseData, chaptersData = []) {
  if (isSupabaseConfigured) {
    let courseId = courseData.id;
    if (!courseId) {
      const { data: newCourse, error: cErr } = await supabase
        .from('courses')
        .insert({
          title: courseData.title,
          description: courseData.description,
          type: courseData.type,
          created_by: courseData.created_by,
        })
        .select()
        .single();
      if (cErr) throw cErr;
      courseId = newCourse.id;
    } else {
      const { error: cErr } = await supabase
        .from('courses')
        .update({
          title: courseData.title,
          description: courseData.description,
          type: courseData.type,
        })
        .eq('id', courseId);
      if (cErr) throw cErr;
    }

    // Replace chapters
    if (chaptersData.length > 0) {
      await supabase.from('course_chapters').delete().eq('course_id', courseId);
      const rows = chaptersData.map((ch, idx) => ({
        course_id: courseId,
        order_index: idx + 1,
        title: ch.title,
        video_url: ch.video_url || null,
        pgn: ch.pgn || null,
        annotations: ch.annotations || [],
      }));
      const { error: chErr } = await supabase.from('course_chapters').insert(rows);
      if (chErr) throw chErr;
    }

    return getCourseById(courseId);
  }

  // Mock save
  const courses = JSON.parse(localStorage.getItem(STORAGE_COURSES) || '[]');
  let courseId = courseData.id;
  let updatedCourse;

  if (!courseId) {
    courseId = `course-${Date.now()}`;
    updatedCourse = {
      ...courseData,
      id: courseId,
      created_at: new Date().toISOString(),
      chapters: chaptersData.map((ch, idx) => ({
        ...ch,
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
      chapters: chaptersData.map((ch, i) => ({
        ...ch,
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

export async function deleteCourse(courseId) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (error) throw error;
    return true;
  }

  const courses = JSON.parse(localStorage.getItem(STORAGE_COURSES) || '[]');
  const filtered = courses.filter((c) => c.id !== courseId);
  localStorage.setItem(STORAGE_COURSES, JSON.stringify(filtered));
  return true;
}

/**
 * -----------------------------------------------------------------------------
 * COURSE ASSIGNMENTS & PROGRESS
 * -----------------------------------------------------------------------------
 */

export async function assignCourseToStudents(courseId, studentIds) {
  const ids = [...new Set((studentIds || []).filter(Boolean))];
  if (ids.length < 1) {
    throw new Error('Select at least 1 student to assign this course.');
  }

  if (isSupabaseConfigured) {
    const selected = new Set(ids);

    // Sync roster: drop assignments for students no longer selected
    const { data: existing, error: existingError } = await supabase
      .from('course_assignments')
      .select('id, student_id')
      .eq('course_id', courseId);
    if (existingError) throw existingError;

    const toRemove = (existing || [])
      .filter((row) => !selected.has(row.student_id))
      .map((row) => row.id);

    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from('course_assignments')
        .delete()
        .in('id', toRemove);
      if (removeError) throw removeError;
    }

    const alreadyAssigned = new Set((existing || []).map((row) => row.student_id));
    const toAdd = ids.filter((sid) => !alreadyAssigned.has(sid));

    if (toAdd.length > 0) {
      const rows = toAdd.map((sid) => ({
        course_id: courseId,
        student_id: sid,
        progress: { completed_chapter_ids: [] },
      }));
      const { error } = await supabase.from('course_assignments').insert(rows);
      if (error) throw error;
    }

    return true;
  }

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

export async function markChapterComplete(courseId, studentId, chapterId) {
  if (isSupabaseConfigured) {
    const { data: assignment } = await supabase
      .from('course_assignments')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .single();

    if (assignment) {
      const current = assignment.progress?.completed_chapter_ids || [];
      if (!current.includes(chapterId)) {
        const updated = [...current, chapterId];
        await supabase
          .from('course_assignments')
          .update({ progress: { completed_chapter_ids: updated } })
          .eq('id', assignment.id);
      }
    }
    return true;
  }

  const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');
  const match = assignments.find((a) => a.course_id === courseId && a.student_id === studentId);
  if (match) {
    const current = match.progress?.completed_chapter_ids || [];
    if (!current.includes(chapterId)) {
      match.progress = { completed_chapter_ids: [...current, chapterId] };
      localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(assignments));
    }
  }
  return true;
}

/**
 * -----------------------------------------------------------------------------
 * GAMES & REVIEWS
 * -----------------------------------------------------------------------------
 */

export async function getGameById(gameId) {
  if (!gameId) return null;

  if (await shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*, review:game_reviews(*)')
        .or(`id.eq.${gameId},chesscom_game_id.eq.${gameId}`)
        .maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getGameById failed, falling back to local storage:', err);
    }
  }

  const games = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
  const reviews = JSON.parse(localStorage.getItem(STORAGE_REVIEWS) || '{}');

  const found = games.find((g) => g.id === gameId || g.chesscom_game_id === gameId);
  if (found) {
    return {
      ...found,
      review: found.review || reviews[found.id] || null,
    };
  }

  const demoFound = DEMO_GAMES.find((g) => g.id === gameId || g.chesscom_game_id === gameId);
  if (demoFound) {
    return {
      ...demoFound,
      review: demoFound.review || reviews[demoFound.id] || null,
    };
  }

  return null;
}

export async function getGamesForStudent(studentId) {
  if (await shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*, review:game_reviews(*)')
        .eq('student_id', studentId)
        .order('played_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase games query failed, falling back to local storage:', err);
    }
  }

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
  if (formattedGames.length === 0) return [];

  if (await shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('games')
        .upsert(formattedGames, { onConflict: 'student_id,chesscom_game_id' })
        .select();
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase upsertGames failed, saving to local storage:', err);
    }
  }

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

  localStorage.setItem(STORAGE_GAMES, JSON.stringify(newGames));
  return formattedGames;
}

export async function saveGameReview(gameId, reviewData) {
  if (await shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('game_reviews')
        .upsert(
          {
            game_id: gameId,
            engine_version: reviewData.engine_version || 'Stockfish 18 NNUE',
            move_classifications: reviewData.move_classifications || [],
            accuracy_white: reviewData.accuracy_white,
            accuracy_black: reviewData.accuracy_black,
          },
          { onConflict: 'game_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase saveGameReview failed, saving to local storage:', err);
    }
  }

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

/**
 * -----------------------------------------------------------------------------
 * ADMIN STUDENT OVERSIGHT
 * -----------------------------------------------------------------------------
 */

export async function getAllStudents() {
  const localStudents = JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || '[]');
  const localGames = JSON.parse(localStorage.getItem(STORAGE_GAMES) || '[]');
  const localAssignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');

  // Check active local user in case they signed in on this client
  const activeProfileRaw = localStorage.getItem('chesslogs_active_profile');
  if (activeProfileRaw) {
    try {
      const active = JSON.parse(activeProfileRaw);
      if (active && (active.role === 'student' || !active.role)) {
        const exists = localStudents.some(
          (s) =>
            s.id === active.id ||
            (s.chesscom_username && active.chesscom_username && s.chesscom_username.toLowerCase() === active.chesscom_username.toLowerCase())
        );
        if (!exists) {
          localStudents.push(active);
          localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(localStudents));
        }
      }
    } catch {
      // ignore JSON error
    }
  }

  if (await shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, games:games(id, played_at, result, time_class, white_username, black_username), assignments:course_assignments(course_id, progress)')
        .eq('role', 'student');

      if (!error && data) {
        // Merge Supabase students with any local students
        const merged = [...data];
        localStudents.forEach((ls) => {
          const match = merged.find(
            (ms) =>
              ms.id === ls.id ||
              (ms.chesscom_username && ls.chesscom_username && ms.chesscom_username.toLowerCase() === ls.chesscom_username.toLowerCase())
          );
          if (!match) {
            const studentGames = localGames.filter(
              (g) =>
                g.student_id === ls.id ||
                (ls.chesscom_username && g.student_id === `chesscom-${ls.chesscom_username.toLowerCase()}`)
            );
            const studentAssignments = localAssignments.filter((a) => a.student_id === ls.id);
            merged.push({
              ...ls,
              games: studentGames,
              assignments: studentAssignments,
            });
          }
        });
        return merged;
      }
    } catch (err) {
      console.warn('Supabase getAllStudents failed, falling back to local storage:', err);
    }
  }

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

export async function deleteStudent(studentId) {
  if (await shouldUseSupabase()) {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', studentId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase deleteStudent failed, falling back to local storage:', err);
    }
  }

  // Local storage cleanup
  const students = JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || '[]');
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
  localStorage.setItem(STORAGE_GAMES, JSON.stringify(filteredGames));

  const assignments = JSON.parse(localStorage.getItem(STORAGE_ASSIGNMENTS) || '[]');
  const filteredAssignments = assignments.filter((a) => a.student_id !== studentId);
  localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(filteredAssignments));

  // If active user was this student, clear local active user
  const activeRaw = localStorage.getItem('chesslogs_active_profile');
  if (activeRaw) {
    try {
      const active = JSON.parse(activeRaw);
      if (active.id === studentId || `chesscom-${active.chesscom_username?.toLowerCase()}` === studentId.toLowerCase()) {
        localStorage.removeItem('chesslogs_active_profile');
      }
    } catch {
      // ignore
    }
  }

  return true;
}

export async function updateStudentProfile(studentId, updates) {
  if (await shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase updateStudentProfile failed, falling back to local storage:', err);
    }
  }

  const students = JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || '[]');
  const idx = students.findIndex((s) => s.id === studentId);
  if (idx >= 0) {
    students[idx] = { ...students[idx], ...updates };
    localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(students));
    return students[idx];
  }
  return null;
}


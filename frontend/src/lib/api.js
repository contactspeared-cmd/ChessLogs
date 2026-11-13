

export function getApiBase() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }
  return '/api';
}

export async function apiRequest(endpoint, options = {}) {
  const base = getApiBase();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr) {
    const error = new Error(netErr.message || 'Network request failed');
    error.status = 0;
    error.isNetworkError = true;
    throw error;
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    let errorMsg = (data && data.error) ? data.error : '';
    if (!errorMsg) {
      if (res.status === 405) {
        errorMsg = 'Method not allowed (405). The server may not be configured to handle API requests.';
      } else if (res.status === 404) {
        errorMsg = 'API endpoint not found (404).';
      } else if (typeof data === 'string' && data && !data.includes('<!DOCTYPE') && !data.includes('<html')) {
        errorMsg = data;
      } else {
        errorMsg = `API Error ${res.status}`;
      }
    }
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    if (res.status === 405 || res.status === 404 || res.status >= 500) {
      error.isBackendUnavailable = true;
    }
    throw error;
  }

  return data;
}

export async function checkBackendHealth() {
  try {
    const base = getApiBase();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${base}/health.php`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === 'ok';
  } catch {
    return false;
  }
}

export const api = {
  
  auth: {
    login: (email, password) =>
      apiRequest('/auth.php?action=login', {
        method: 'POST',
        body: { email, password },
      }),
    signup: (data) =>
      apiRequest('/auth.php?action=signup', {
        method: 'POST',
        body: data,
      }),
    chesscom: (username, extra = {}) =>
      apiRequest('/auth.php?action=chesscom', {
        method: 'POST',
        body: { username, ...extra },
      }),
    getProfile: (id) =>
      apiRequest(`/auth.php?action=profile&id=${encodeURIComponent(id)}`),
    updateProfile: (id, updates) =>
      apiRequest('/auth.php?action=profile', {
        method: 'PUT',
        body: { id, ...updates },
      }),
    me: (id) =>
      apiRequest(`/auth.php?action=me&id=${encodeURIComponent(id)}`),
    getUsers: () =>
      apiRequest('/auth.php?action=users'),
  },

  
  courses: {
    getAll: (role = 'student', studentId = null) => {
      const params = new URLSearchParams();
      if (role) params.set('role', role);
      if (studentId) params.set('student_id', studentId);
      return apiRequest(`/courses.php?${params.toString()}`);
    },
    getById: (courseId, studentId = null) => {
      const params = new URLSearchParams({ id: courseId });
      if (studentId) params.set('student_id', studentId);
      return apiRequest(`/courses.php?${params.toString()}`);
    },
    save: (courseData, chaptersData = []) =>
      apiRequest('/courses.php', {
        method: 'POST',
        body: { course: courseData, chapters: chaptersData },
      }),
    delete: (courseId) =>
      apiRequest(`/courses.php?id=${encodeURIComponent(courseId)}`, {
        method: 'DELETE',
      }),
  },

  
  assignments: {
    assign: (courseId, studentIds) =>
      apiRequest('/assignments.php?action=assign', {
        method: 'POST',
        body: { course_id: courseId, student_ids: studentIds },
      }),
    markProgress: (courseId, studentId, chapterId, mode = 'video') =>
      apiRequest('/assignments.php?action=progress', {
        method: 'POST',
        body: { course_id: courseId, student_id: studentId, chapter_id: chapterId, mode },
      }),
    saveStudyMode: (courseId, studentId, mode) =>
      apiRequest('/assignments.php?action=study_mode', {
        method: 'POST',
        body: { course_id: courseId, student_id: studentId, mode },
      }),
    saveTrainer: (courseId, studentId, trainerProgress) =>
      apiRequest('/assignments.php?action=trainer_progress', {
        method: 'POST',
        body: { course_id: courseId, student_id: studentId, trainerProgress },
      }),
    getTrainer: (courseId, studentId) =>
      apiRequest(`/assignments.php?course_id=${encodeURIComponent(courseId)}&student_id=${encodeURIComponent(studentId)}`),
  },

  
  games: {
    getById: (gameId) =>
      apiRequest(`/games.php?id=${encodeURIComponent(gameId)}`),
    getByStudent: (studentId) =>
      apiRequest(`/games.php?student_id=${encodeURIComponent(studentId)}`),
    upsert: (games) =>
      apiRequest('/games.php?action=upsert', {
        method: 'POST',
        body: { games },
      }),
    replaceSynced: (studentId, games) =>
      apiRequest('/games.php?action=replace_synced', {
        method: 'POST',
        body: { student_id: studentId, games },
      }),
    saveReview: (gameId, reviewData) =>
      apiRequest('/games.php?action=review', {
        method: 'POST',
        body: { game_id: gameId, review: reviewData },
      }),
  },

  
  students: {
    getAll: () =>
      apiRequest('/students.php'),
    update: (studentId, updates) =>
      apiRequest(`/students.php?id=${encodeURIComponent(studentId)}`, {
        method: 'PUT',
        body: updates,
      }),
    delete: (studentId) =>
      apiRequest(`/students.php?id=${encodeURIComponent(studentId)}`, {
        method: 'DELETE',
      }),
  },
};

export default api;

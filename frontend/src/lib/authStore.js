

const STORAGE_ACCOUNTS = 'chesslogs_site_accounts';
const STORAGE_STUDENTS = 'chesslogs_students';
const STORAGE_ACTIVE_PROFILE = 'chesslogs_active_profile';
export const STORAGE_CREDENTIALS = 'chesslogs_coach_credentials';
export const STORAGE_ENROLLMENTS = 'chesslogs_student_enrollments';
export const STORAGE_REQUIREMENTS = 'chesslogs_student_requirements';


export function formatCompositeName({ firstName = '', middleInitial = '', lastName = '', suffix = '' }) {
  const parts = [];
  const f = (firstName || '').trim();
  const m = (middleInitial || '').trim();
  const l = (lastName || '').trim();
  const s = (suffix || '').trim();

  if (f) parts.push(f);
  if (m) {
    const miClean = m.replace(/\.+$/, '');
    parts.push(`${miClean}.`);
  }
  if (l) parts.push(l);
  if (s) parts.push(s);

  return parts.join(' ') || 'Chess Player';
}


export async function hashPassword(password, salt) {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    let hash = 0;
    const str = `${salt}:${password}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}


export function generateSalt() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 18);
}


const DEFAULT_SALT = 'cl_salt_2026';
const ADMIN_HASH = '69226bbed9175da60bd820400f9711108f8bef8380233e5501b2656fa98b643b';
const COACH_HASH = '3287a8b41fb8445aee716813b1962cc78ac059e561ee5244ce28df7fbe5b01b6';
const STUDENT_HASH = 'c089c940e4e013446be55ee67c35c4c91fb703ca0fe3956608be470f0e05d3b0';

const SEED_ACCOUNTS = [
  {
    id: 'admin-satoalt33-uuid',
    email: 'satoalt33@gmail.com',
    secondary_emails: [],
    first_name: 'Site',
    middle_initial: '',
    last_name: 'Admin',
    suffix: '',
    date_of_birth: '1990-01-01',
    display_name: 'Admin',
    role: 'admin',
    chesscom_username: '',
    bio: 'ChessLogs System Administrator. Oversees platform governance, coaches, and students.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    salt: DEFAULT_SALT,
    password_hash: ADMIN_HASH,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'coach-magnus-uuid',
    email: 'coach@chesslogs.com',
    secondary_emails: [],
    first_name: 'Magnus',
    middle_initial: 'C',
    last_name: 'Carlsen',
    suffix: '',
    date_of_birth: '1990-11-30',
    display_name: 'Magnus C. Carlsen',
    role: 'coach',
    chesscom_username: 'magnuscarlsen',
    elo_rating: 2850,
    min_student_elo: 1300,
    coaching_standards: 'Focus on endgame precision, active piece placement, dynamic pawn structures, and time management.',
    bio: 'FIDE Grandmaster, Senior Trainer, and former World Chess Champion. Mentoring competitive players.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    salt: DEFAULT_SALT,
    password_hash: COACH_HASH,
    created_at: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'student-alex-uuid',
    email: 'student@chesslogs.com',
    secondary_emails: [],
    first_name: 'Alex',
    middle_initial: 'M',
    last_name: 'Rivera',
    suffix: 'Jr.',
    date_of_birth: '2004-06-15',
    display_name: 'Alex M. Rivera Jr.',
    role: 'student',
    chesscom_username: 'alexrivera_chess',
    current_elo: 1540,
    bio: 'Aspiring tournament competitor aiming for 1800 Rapid. Dedicated to daily tactical puzzle and opening study.',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    salt: DEFAULT_SALT,
    password_hash: STUDENT_HASH,
    created_at: '2026-01-10T00:00:00.000Z',
  },
];

const SEED_CREDENTIALS = [
  {
    id: 'cred-magnus-01',
    coach_id: 'coach-magnus-uuid',
    coach_name: 'Magnus C. Carlsen',
    coach_email: 'coach@chesslogs.com',
    verified_by_admin_id: 'admin-satoalt33-uuid',
    credential_type: 'FIDE Senior Trainer License',
    issuer: 'FIDE Trainer Commission',
    document_url: 'https://ratings.fide.com/trainer_certificates/FST-2024-889.pdf',
    verification_status: 'verified',
    rejection_reason: null,
    submitted_at: '2026-01-06T10:00:00.000Z',
    verified_at: '2026-01-07T14:30:00.000Z',
  },
  {
    id: 'cred-sample-02',
    coach_id: 'coach-judit-uuid',
    coach_name: 'Judit Polgar',
    coach_email: 'judit@chesslogs.com',
    verified_by_admin_id: null,
    credential_type: 'Grandmaster Coaching Certificate',
    issuer: 'European Chess Union (ECU)',
    document_url: 'https://ecu.online/certificates/ECU-COACH-7721.pdf',
    verification_status: 'pending',
    rejection_reason: null,
    submitted_at: '2026-02-01T08:15:00.000Z',
    verified_at: null,
  },
];

const SEED_ENROLLMENTS = [
  {
    id: 'enr-alex-magnus',
    student_id: 'student-alex-uuid',
    student_name: 'Alex M. Rivera Jr.',
    student_email: 'student@chesslogs.com',
    student_elo: 1540,
    coach_id: 'coach-magnus-uuid',
    coach_name: 'Magnus C. Carlsen',
    reviewed_by_admin_id: 'admin-satoalt33-uuid',
    applied_at: '2026-01-12T09:00:00.000Z',
    review_status: 'approved',
    review_notes: 'Meets minimum Elo threshold (>1300). Ready for Sicilian Najdorf curriculum.',
    reviewed_at: '2026-01-12T11:00:00.000Z',
  },
  {
    id: 'enr-new-student-pending',
    student_id: 'student-elena-uuid',
    student_name: 'Elena V. Rostova',
    student_email: 'elena@chesslogs.com',
    student_elo: 1780,
    coach_id: 'coach-magnus-uuid',
    coach_name: 'Magnus C. Carlsen',
    reviewed_by_admin_id: null,
    applied_at: '2026-02-05T14:20:00.000Z',
    review_status: 'pending',
    review_notes: 'Application submitted for masterclass cohort. Preparing PGN game history.',
    reviewed_at: null,
  },
];


export function getSiteAccounts() {
  if (typeof window === 'undefined') return SEED_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS);
    let accounts = raw ? JSON.parse(raw) : [];

    for (const seed of SEED_ACCOUNTS) {
      const idx = accounts.findIndex(
        (a) => a.id === seed.id || a.email?.toLowerCase() === seed.email.toLowerCase()
      );
      if (idx === -1) {
        accounts.push(seed);
      } else {
        accounts[idx] = {
          ...seed,
          ...accounts[idx],
          role: accounts[idx].role || seed.role,
          password_hash: accounts[idx].password_hash || seed.password_hash,
          salt: accounts[idx].salt || seed.salt,
        };
      }
    }

    localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(accounts));

    const rawStudents = localStorage.getItem(STORAGE_STUDENTS);
    if (rawStudents) {
      const parsedStudents = JSON.parse(rawStudents);
      const cleanStudents = parsedStudents.filter(
        (s) => !DUMMY_IDS.has(s.id) && !DUMMY_EMAILS.has(s.email?.toLowerCase())
      );
      if (cleanStudents.length !== parsedStudents.length) {
        localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(cleanStudents));
      }
    }

    return accounts;
  } catch (err) {
    console.warn('Failed to read site accounts from localStorage:', err);
    return SEED_ACCOUNTS;
  }
}


export function saveSiteAccounts(accounts) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save site accounts:', err);
  }
}


export function findSiteAccountByEmail(email) {
  if (!email) return null;
  const target = email.trim().toLowerCase();
  const accounts = getSiteAccounts();
  return accounts.find((acc) => {
    if (acc.email?.toLowerCase() === target) return true;
    if (Array.isArray(acc.secondary_emails) && acc.secondary_emails.some((e) => e.toLowerCase() === target)) {
      return true;
    }
    return false;
  }) || null;
}


export function findSiteAccountById(id) {
  if (!id) return null;
  const accounts = getSiteAccounts();
  return accounts.find((acc) => acc.id === id) || null;
}


export async function createSiteAccount({
  firstName,
  middleInitial,
  lastName,
  suffix = '',
  dateOfBirth,
  email,
  chesscomUsername = '',
  password,
  role = 'student',
  avatarUrl = null,
  bio = '',
}) {
  const cleanFirst = (firstName || '').trim();
  const cleanMi = (middleInitial || '').trim().toUpperCase();
  const cleanLast = (lastName || '').trim();
  const cleanSuffix = (suffix || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanChesscom = (chesscomUsername || '').trim();
  const cleanDob = (dateOfBirth || '').trim();

  if (!cleanFirst) {
    throw new Error('First Name is required.');
  }
  if (!cleanMi) {
    throw new Error('Middle Initial (MI) is required.');
  }
  if (!cleanLast) {
    throw new Error('Last Name is required.');
  }
  if (!cleanDob) {
    throw new Error('Date of Birth is required.');
  }
  if (!cleanEmail) {
    throw new Error('Email address is required.');
  }
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const existing = findSiteAccountByEmail(cleanEmail);
  if (existing) {
    throw new Error(`An account with the email "${cleanEmail}" already exists. Please sign in instead.`);
  }

  const displayName = formatCompositeName({
    firstName: cleanFirst,
    middleInitial: cleanMi,
    lastName: cleanLast,
    suffix: cleanSuffix,
  });

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`;
  const now = new Date().toISOString();

  const newAccount = {
    id,
    email: cleanEmail,
    first_name: cleanFirst,
    middle_initial: cleanMi,
    last_name: cleanLast,
    suffix: cleanSuffix,
    date_of_birth: cleanDob,
    display_name: displayName,
    role,
    chesscom_username: cleanChesscom,
    bio: bio || `Chess student registered on ${new Date().toLocaleDateString()}`,
    avatar_url:
      avatarUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    salt,
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
  };

  const accounts = getSiteAccounts();
  accounts.push(newAccount);
  saveSiteAccounts(accounts);

  if (typeof localStorage !== 'undefined') {
    try {
      const rawStudents = localStorage.getItem(STORAGE_STUDENTS);
      const students = rawStudents ? JSON.parse(rawStudents) : [];
      const studentIdx = students.findIndex((s) => s.id === id || s.email?.toLowerCase() === cleanEmail);
      if (studentIdx >= 0) {
        students[studentIdx] = { ...students[studentIdx], ...newAccount };
      } else {
        students.push(newAccount);
      }
      localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(students));
    } catch (err) {
      console.warn('Failed to sync new student to student roster:', err);
    }
  }

  const safeProfile = { ...newAccount };
  delete safeProfile.password_hash;
  delete safeProfile.salt;

  const sessionUser = {
    id: newAccount.id,
    email: newAccount.email,
  };

  return { user: sessionUser, profile: safeProfile };
}


export async function verifySiteCredentials(email, password) {
  if (!email || !password) {
    throw new Error('Please enter both your email and password.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const account = findSiteAccountByEmail(cleanEmail);

  if (!account) {
    throw new Error('No account found with this email. Please check spelling or create an account.');
  }

  let isValid = false;

  if (account.password_hash && account.salt) {
    const checkHash = await hashPassword(password, account.salt);
    if (checkHash === account.password_hash) {
      isValid = true;
    }
  }

  if (!isValid) {
    const isSeedAdmin = account.email?.toLowerCase() === 'satoalt33@gmail.com' && password === 'ChessLogsAdmin2026!';
    const isSeedCoach = account.email?.toLowerCase() === 'coach@chesslogs.com' && password === 'Coach2026!';
    const isSeedStudent = account.email?.toLowerCase() === 'student@chesslogs.com' && password === 'Student2026!';

    if (isSeedAdmin || isSeedCoach || isSeedStudent) {
      isValid = true;
      const salt = generateSalt();
      account.salt = salt;
      account.password_hash = await hashPassword(password, salt);
      const accounts = getSiteAccounts();
      const idx = accounts.findIndex((a) => a.id === account.id);
      if (idx >= 0) {
        accounts[idx] = account;
        saveSiteAccounts(accounts);
      }
    }
  }

  if (!isValid) {
    throw new Error('Incorrect password. Please verify and try again.');
  }

  const safeProfile = { ...account };
  delete safeProfile.password_hash;
  delete safeProfile.salt;

  const sessionUser = {
    id: account.id,
    email: account.email,
  };

  return { user: sessionUser, profile: safeProfile };
}


export function updateSiteAccount(id, updates) {
  if (!id) return null;
  const accounts = getSiteAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  const current = accounts[idx];

  const nextFirst = updates.first_name !== undefined ? updates.first_name : current.first_name;
  const nextMi = updates.middle_initial !== undefined ? updates.middle_initial : current.middle_initial;
  const nextLast = updates.last_name !== undefined ? updates.last_name : current.last_name;
  const nextSuffix = updates.suffix !== undefined ? updates.suffix : current.suffix;

  const displayName = updates.display_name || formatCompositeName({
    firstName: nextFirst,
    middleInitial: nextMi,
    lastName: nextLast,
    suffix: nextSuffix,
  });

  const updatedAccount = {
    ...current,
    ...updates,
    first_name: nextFirst,
    middle_initial: nextMi,
    last_name: nextLast,
    suffix: nextSuffix,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };

  accounts[idx] = updatedAccount;
  saveSiteAccounts(accounts);

  if (typeof localStorage !== 'undefined') {
    try {
      const rawStudents = localStorage.getItem(STORAGE_STUDENTS);
      if (rawStudents) {
        const students = JSON.parse(rawStudents);
        const sIdx = students.findIndex((s) => s.id === id);
        if (sIdx >= 0) {
          students[sIdx] = { ...students[sIdx], ...updatedAccount };
          localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(students));
        }
      }
    } catch (err) {
      console.warn('Failed to update student in roster:', err);
    }
  }

  const safeProfile = { ...updatedAccount };
  delete safeProfile.password_hash;
  delete safeProfile.salt;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_ACTIVE_PROFILE, JSON.stringify(safeProfile));
    } catch {
    }
  }

  return safeProfile;
}


export function deleteSiteAccount(id) {
  if (!id) return false;
  const accounts = getSiteAccounts();
  const filtered = accounts.filter((a) => a.id !== id);
  saveSiteAccounts(filtered);

  try {
    const rawStudents = localStorage.getItem(STORAGE_STUDENTS);
    if (rawStudents) {
      const students = JSON.parse(rawStudents);
      const sFiltered = students.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(sFiltered));
    }
  } catch {
  }

  return true;
}




export function getAllAccounts() {
  const accounts = getSiteAccounts();
  const rawStudents = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_STUDENTS) : null;
  const students = rawStudents ? JSON.parse(rawStudents) : [];

  const map = new Map();
  accounts.forEach((acc) => {
    map.set(acc.id, { ...acc, role: acc.role || 'student' });
  });

  students.forEach((std) => {
    if (!map.has(std.id)) {
      map.set(std.id, {
        ...std,
        role: std.role || 'student',
      });
    }
  });

  return Array.from(map.values()).map((acc) => {
    const safe = { ...acc };
    delete safe.password_hash;
    delete safe.salt;
    return safe;
  });
}


export function updateAccountRole(id, newRole) {
  if (!id || !['admin', 'coach', 'student'].includes(newRole)) return null;

  const accounts = getSiteAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx >= 0) {
    accounts[idx].role = newRole;
    accounts[idx].updated_at = new Date().toISOString();
    saveSiteAccounts(accounts);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const rawStudents = localStorage.getItem(STORAGE_STUDENTS);
      if (rawStudents) {
        const students = JSON.parse(rawStudents);
        const sIdx = students.findIndex((s) => s.id === id);
        if (sIdx >= 0) {
          students[sIdx].role = newRole;
          students[sIdx].updated_at = new Date().toISOString();
          localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(students));
        }
      }

      const activeRaw = localStorage.getItem(STORAGE_ACTIVE_PROFILE);
      if (activeRaw) {
        const active = JSON.parse(activeRaw);
        if (active?.id === id) {
          active.role = newRole;
          localStorage.setItem(STORAGE_ACTIVE_PROFILE, JSON.stringify(active));
        }
      }
    } catch {
    }
  }

  return true;
}



export function getCoachCredentials(coachId = null) {
  if (typeof window === 'undefined') return SEED_CREDENTIALS;
  try {
    const raw = localStorage.getItem(STORAGE_CREDENTIALS);
    let credentials = raw ? JSON.parse(raw) : [];
    if (!raw || credentials.length === 0) {
      credentials = [...SEED_CREDENTIALS];
      localStorage.setItem(STORAGE_CREDENTIALS, JSON.stringify(credentials));
    }
    if (coachId) {
      return credentials.filter((c) => c.coach_id === coachId);
    }
    return credentials;
  } catch (err) {
    console.warn('Failed to get coach credentials:', err);
    return SEED_CREDENTIALS;
  }
}

export function submitCoachCredential({
  coachId,
  credentialType,
  issuer,
  documentUrl,
  coachName = '',
  coachEmail = '',
  title = '',
  rating = '',
  specialty = '',
  experience = '',
  bio = '',
}) {
  const credentials = getCoachCredentials();
  const id = `cred-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newEntry = {
    id,
    coach_id: coachId,
    coach_name: coachName,
    coach_email: coachEmail,
    verified_by_admin_id: null,
    credential_type: credentialType,
    issuer: issuer || 'Chess Federation',
    document_url: documentUrl,
    title,
    rating,
    specialty,
    experience,
    bio,
    verification_status: 'pending',
    rejection_reason: null,
    submitted_at: new Date().toISOString(),
    verified_at: null,
  };

  credentials.unshift(newEntry);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_CREDENTIALS, JSON.stringify(credentials));
  }
  return newEntry;
}

export function reviewCoachCredential(credentialId, status, rejectionReason = null, adminId = 'admin-satoalt33-uuid') {
  const credentials = getCoachCredentials();
  const idx = credentials.findIndex((c) => c.id === credentialId);
  if (idx === -1) return null;

  credentials[idx] = {
    ...credentials[idx],
    verification_status: status,
    rejection_reason: status === 'rejected' ? rejectionReason : null,
    verified_by_admin_id: adminId,
    verified_at: new Date().toISOString(),
  };

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_CREDENTIALS, JSON.stringify(credentials));
  }

  if (status === 'verified' && credentials[idx].coach_id) {
    updateAccountRole(credentials[idx].coach_id, 'coach');
  }

  return credentials[idx];
}



export function getStudentEnrollments(coachId = null, studentId = null) {
  if (typeof window === 'undefined') return SEED_ENROLLMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_ENROLLMENTS);
    let enrollments = raw ? JSON.parse(raw) : [];
    if (!raw || enrollments.length === 0) {
      enrollments = [...SEED_ENROLLMENTS];
      localStorage.setItem(STORAGE_ENROLLMENTS, JSON.stringify(enrollments));
    }
    if (coachId) {
      return enrollments.filter((e) => e.coach_id === coachId);
    }
    if (studentId) {
      return enrollments.filter((e) => e.student_id === studentId);
    }
    return enrollments;
  } catch (err) {
    console.warn('Failed to get student enrollments:', err);
    return SEED_ENROLLMENTS;
  }
}

export function applyStudentEnrollment({
  studentId,
  studentName = '',
  studentEmail = '',
  studentElo = 1200,
  coachId,
  coachName = '',
  notes = '',
}) {
  const enrollments = getStudentEnrollments();
  const existing = enrollments.find((e) => e.student_id === studentId && e.coach_id === coachId);
  if (existing) {
    return existing;
  }

  const newEntry = {
    id: `enr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    student_id: studentId,
    student_name: studentName,
    student_email: studentEmail,
    student_elo: studentElo,
    coach_id: coachId,
    coach_name: coachName,
    reviewed_by_admin_id: null,
    applied_at: new Date().toISOString(),
    review_status: 'pending',
    review_notes: notes,
    reviewed_at: null,
  };

  enrollments.unshift(newEntry);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_ENROLLMENTS, JSON.stringify(enrollments));
  }
  return newEntry;
}

export function reviewStudentEnrollment(enrollmentId, status, reviewNotes = '', adminId = null) {
  const enrollments = getStudentEnrollments();
  const idx = enrollments.findIndex((e) => e.id === enrollmentId);
  if (idx === -1) return null;

  enrollments[idx] = {
    ...enrollments[idx],
    review_status: status,
    review_notes: reviewNotes || enrollments[idx].review_notes,
    reviewed_by_admin_id: adminId,
    reviewed_at: new Date().toISOString(),
  };

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_ENROLLMENTS, JSON.stringify(enrollments));
  }
  return enrollments[idx];
}



export function getStudentRequirements(studentId = null) {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_REQUIREMENTS) : null;
    let reqs = raw ? JSON.parse(raw) : [];
    if (studentId) {
      return reqs.filter((r) => r.student_id === studentId);
    }
    return reqs;
  } catch {
    return [];
  }
}

export function submitStudentRequirement({ studentId, requirementType, documentUrl }) {
  const reqs = getStudentRequirements();
  const newEntry = {
    id: `req-${Date.now()}`,
    student_id: studentId,
    requirement_type: requirementType,
    document_url: documentUrl,
    review_status: 'pending',
    review_notes: null,
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
  };
  reqs.unshift(newEntry);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_REQUIREMENTS, JSON.stringify(reqs));
  }
  return newEntry;
}

export function reviewStudentRequirement(requirementId, status, reviewNotes = '', adminId = null) {
  const reqs = getStudentRequirements();
  const idx = reqs.findIndex((r) => r.id === requirementId);
  if (idx === -1) return null;

  reqs[idx] = {
    ...reqs[idx],
    review_status: status,
    review_notes: reviewNotes,
    reviewed_by_admin_id: adminId,
    reviewed_at: new Date().toISOString(),
  };

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_REQUIREMENTS, JSON.stringify(reqs));
  }
  return reqs[idx];
}

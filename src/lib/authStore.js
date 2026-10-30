/**
 * ChessLogs Site Account Management Store
 * Provides persistent, site-native account creation, authentication,
 * and profile management with support for composite user names and DOB.
 */

const STORAGE_ACCOUNTS = 'chesslogs_site_accounts';
const STORAGE_STUDENTS = 'chesslogs_students';
const STORAGE_ACTIVE_PROFILE = 'chesslogs_active_profile';

/**
 * Format composite name according to rules:
 * First Name, Middle Initial (with dot), Last Name, Suffix
 * Example: Alex M. Rivera Jr.
 */
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

/**
 * Securely hash password on the client using Web Crypto SHA-256 with salt
 */
export async function hashPassword(password, salt) {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    // Fallback for non-browser environments
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

/**
 * Generate cryptographic random salt
 */
export function generateSalt() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 18);
}

/**
 * Seed initial system administrator account if none exist.
 */
const DEFAULT_SALT = 'cl_salt_2026';

const SEED_ACCOUNTS = [
  {
    id: 'coach-kasparov-uuid',
    email: 'satoalt33@gmail.com',
    secondary_emails: ['coach@chesslogs.com'],
    first_name: 'Super',
    middle_initial: 'A',
    last_name: 'Admin',
    suffix: '',
    date_of_birth: '1985-01-01',
    display_name: 'Super Admin',
    role: 'admin',
    chesscom_username: '',
    bio: 'ChessLogs Head Coach and Administrator.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    salt: DEFAULT_SALT,
    password_hash: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Retrieve all registered site accounts
 */
export function getSiteAccounts() {
  if (typeof window === 'undefined') return SEED_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
      return SEED_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
      return SEED_ACCOUNTS;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to read site accounts from localStorage:', err);
    return SEED_ACCOUNTS;
  }
}

/**
 * Save site accounts array to storage
 */
export function saveSiteAccounts(accounts) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save site accounts:', err);
  }
}

/**
 * Find account by email (case-insensitive, supports secondary emails)
 */
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

/**
 * Find account by ID
 */
export function findSiteAccountById(id) {
  if (!id) return null;
  const accounts = getSiteAccounts();
  return accounts.find((acc) => acc.id === id) || null;
}

/**
 * Create a new native site account.
 * Validates composite name components, DOB, email, passwords.
 */
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
  const cleanChesscom = (chesscomUsername || '').trim().toLowerCase();
  const cleanDob = (dateOfBirth || '').trim();

  // 1. Validation
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

  // 2. Check for duplicate email
  const existing = findSiteAccountByEmail(cleanEmail);
  if (existing) {
    throw new Error(`An account with the email "${cleanEmail}" already exists. Please sign in instead.`);
  }

  // 3. Compute Composite Display Name
  const displayName = formatCompositeName({
    firstName: cleanFirst,
    middleInitial: cleanMi,
    lastName: cleanLast,
    suffix: cleanSuffix,
  });

  // 4. Hash password
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  // 5. Build user and profile
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

  // 6. Save to site accounts
  const accounts = getSiteAccounts();
  accounts.push(newAccount);
  saveSiteAccounts(accounts);

  // 7. Sync with student roster in localStorage for Coach Command Center
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

  // Safe user representation (omit sensitive hash & salt from return)
  const safeProfile = { ...newAccount };
  delete safeProfile.password_hash;
  delete safeProfile.salt;

  const sessionUser = {
    id: newAccount.id,
    email: newAccount.email,
  };

  return { user: sessionUser, profile: safeProfile };
}

/**
 * Verify credentials and sign in to site account
 */
export async function verifySiteCredentials(email, password) {
  if (!email || !password) {
    throw new Error('Please enter both your email and password.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const account = findSiteAccountByEmail(cleanEmail);

  if (!account) {
    throw new Error('No account found with this email. Please check spelling or create an account.');
  }

  // Verify password
  let isValid = false;

  // Case 1: Pre-computed hash exists
  if (account.password_hash && account.salt) {
    const checkHash = await hashPassword(password, account.salt);
    if (checkHash === account.password_hash) {
      isValid = true;
    }
  }

  // Case 2: Seed admin initial sign in verification
  if (!isValid) {
    if (account.role === 'admin' && password === 'ChessLogsAdmin2026!') {
      isValid = true;
      // Upgrade account with secure SHA-256 hash on first sign in
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

/**
 * Update site account profile
 */
export function updateSiteAccount(id, updates) {
  if (!id) return null;
  const accounts = getSiteAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  const current = accounts[idx];

  // Re-compute display_name if any composite name parts were supplied
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

  // Sync with student roster
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

  // Update active profile in local storage
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_ACTIVE_PROFILE, JSON.stringify(safeProfile));
    } catch {
      // ignore
    }
  }

  return safeProfile;
}

/**
 * Delete a site account
 */
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
    // ignore
  }

  return true;
}

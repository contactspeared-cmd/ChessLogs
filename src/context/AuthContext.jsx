import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { fetchChesscomProfile } from '../lib/chesscom';
import {
  createSiteAccount,
  verifySiteCredentials,
  updateSiteAccount,
  findSiteAccountById,
  getSiteAccounts,
} from '../lib/authStore';

const AuthContext = createContext(null);

const STORAGE_KEY_LOCAL_USER = 'chesslogs_active_profile';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load profile from PHP API, or fallback to Local Site Accounts
  const fetchProfile = useCallback(async (userId) => {
    // 1. Try PHP MySQL backend first
    try {
      const data = await api.auth.getProfile(userId);
      if (data && data.id) return data;
    } catch {
      // ignore and proceed to fallback
    }

    // 2. Check local site accounts store
    const siteAcc = findSiteAccountById(userId);
    if (siteAcc) {
      const safe = { ...siteAcc };
      delete safe.password_hash;
      delete safe.salt;
      return safe;
    }

    // 3. Fallback to active profile in localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOCAL_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id === userId) return parsed;
      }
    } catch {
      // ignore
    }

    return null;
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      // Ensure seed accounts exist in storage
      getSiteAccounts();

      let restored = false;

      // Restore active profile from localStorage and refresh from PHP backend
      const saved = localStorage.getItem(STORAGE_KEY_LOCAL_USER);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) {
            let freshProfile = null;
            try {
              freshProfile = await fetchProfile(parsed.id);
            } catch {
              freshProfile = parsed;
            }

            const active = freshProfile || parsed;
            if (mounted) {
              setUser({
                id: active.id,
                email: active.email || `${active.chesscom_username || active.role}@chesslogs.local`,
              });
              setProfile(active);
              restored = true;
            }
          }
        } catch {
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
        }
      }

      if (!restored && mounted) {
        setUser(null);
        setProfile(null);
      }

      if (mounted) setLoading(false);
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  // Sign in with email & password
  const signInWithEmail = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Authenticate with PHP MySQL backend
    let apiErr = null;
    try {
      const res = await api.auth.login(cleanEmail, password);
      if (res?.user && res?.profile) {
        setUser(res.user);
        setProfile(res.profile);
        localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(res.profile));
        return res;
      }
    } catch (err) {
      apiErr = err;
      console.warn('PHP API login failed, checking local credentials fallback:', err?.message);
    }

    // 2. Fall back to local site accounts
    try {
      const siteResult = await verifySiteCredentials(cleanEmail, password);
      if (siteResult?.user && siteResult?.profile) {
        setUser(siteResult.user);
        setProfile(siteResult.profile);
        localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(siteResult.profile));
        return siteResult;
      }
    } catch (localErr) {
      // If the PHP backend returned 401 Unauthorized (invalid credentials explicitly rejected by backend), show that
      if (apiErr && apiErr.status === 401) {
        throw apiErr;
      }
      // If the API had a routing/connection error (e.g. 405 Method Not Allowed on static hosts, 404, or network failure),
      // bubble up the local validation error (e.g. "Incorrect password" or "No account found with this email")
      if (localErr && localErr.message) {
        throw localErr;
      }
      throw apiErr || new Error('Invalid email or password. Please verify your credentials.');
    }
  };

  /**
   * Sign up with complete user details:
   * Composite name (First Name, MI, Last Name required*), Suffix, Date of Birth,
   * Email, Chess.com username, Password and Confirm Password.
   */
  const signUpWithEmail = async ({
    firstName,
    middleInitial,
    lastName,
    suffix = '',
    dateOfBirth,
    email,
    chesscomUsername = '',
    password,
    confirmPassword,
    role = 'student',
  }) => {
    // 1. Confirm password check
    if (!password) {
      throw new Error('Password is required.');
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new Error('Passwords do not match. Please re-enter.');
    }

    // 2. Register via PHP MySQL backend
    try {
      const res = await api.auth.signup({
        firstName,
        middleInitial,
        lastName,
        suffix,
        dateOfBirth,
        email,
        chesscomUsername,
        password,
        confirmPassword,
        role,
      });

      if (res?.user && res?.profile) {
        setUser(res.user);
        setProfile(res.profile);
        localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(res.profile));
        return res;
      }
    } catch (apiErr) {
      console.warn('PHP API signup error, falling back to local storage creation:', apiErr?.message);
      // Fallback
      const { user: siteUser, profile: siteProfile } = await createSiteAccount({
        firstName,
        middleInitial,
        lastName,
        suffix,
        dateOfBirth,
        email,
        chesscomUsername,
        password,
        role,
      });

      setUser(siteUser);
      setProfile(siteProfile);
      localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(siteProfile));
      return { user: siteUser, profile: siteProfile, session: true };
    }
  };

  // Sign in using Chess.com account (verifies against Chess.com API)
  const signInWithChesscom = async (username) => {
    if (!username || !username.trim()) {
      throw new Error('Please enter your Chess.com username.');
    }
    const cleanUsername = username.trim().toLowerCase();

    // Verify existence with Chess.com Public API
    const liveProfile = await fetchChesscomProfile(cleanUsername);
    if (!liveProfile) {
      throw new Error(`Chess.com username "${cleanUsername}" was not found.`);
    }

    try {
      const res = await api.auth.chesscom(cleanUsername, {
        displayName: liveProfile.name || cleanUsername,
        avatarUrl:
          liveProfile.avatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: liveProfile.location ? `Chess.com member from ${liveProfile.location}` : '',
      });

      if (res?.user && res?.profile) {
        setUser(res.user);
        setProfile(res.profile);
        localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(res.profile));
        return res;
      }
    } catch (apiErr) {
      console.warn('PHP API chesscom login failed, falling back to local profile:', apiErr?.message);
    }

    let finalId = `chesscom-${cleanUsername}`;
    let finalProfile = {
      id: finalId,
      role: 'student',
      first_name: liveProfile.name ? liveProfile.name.split(' ')[0] : cleanUsername,
      middle_initial: '',
      last_name: liveProfile.name ? liveProfile.name.split(' ').slice(1).join(' ') : '',
      suffix: '',
      date_of_birth: '',
      display_name: liveProfile.name || cleanUsername,
      avatar_url:
        liveProfile.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      chesscom_username: cleanUsername,
      bio: liveProfile.location ? `Chess.com member from ${liveProfile.location}` : '',
      created_at: new Date().toISOString(),
    };

    const sessionUser = {
      id: finalProfile.id,
      email: finalProfile.email || `${cleanUsername}@chess.com`,
    };

    setUser(sessionUser);
    setProfile(finalProfile);
    localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(finalProfile));
    return { user: sessionUser, profile: finalProfile };
  };

  // Google OAuth mock / fallback
  const signInWithGoogle = async () => {
    const mockGoogleUser = {
      id: `google-${Date.now()}`,
      role: 'student',
      first_name: 'Google',
      middle_initial: '',
      last_name: 'Student',
      suffix: '',
      date_of_birth: '',
      display_name: 'Google Student',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      chesscom_username: '',
      bio: '',
      created_at: new Date().toISOString(),
    };
    setUser({ id: mockGoogleUser.id, email: 'student@gmail.com' });
    setProfile(mockGoogleUser);
    localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(mockGoogleUser));
    return { user: { id: mockGoogleUser.id, email: 'student@gmail.com' } };
  };

  // Sign out
  const signOut = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem(STORAGE_KEY_LOCAL_USER);
  };

  // Update profile
  const updateProfile = async (updates) => {
    if (!profile) return null;

    try {
      const updated = await api.auth.updateProfile(profile.id, updates);
      if (updated && updated.id) {
        setProfile(updated);
        localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(updated));
        return updated;
      }
    } catch (err) {
      console.warn('PHP API updateProfile failed, updating local state:', err);
    }

    const updated = updateSiteAccount(profile.id, updates);
    const resolvedProfile = updated || {
      ...profile,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    setProfile(resolvedProfile);
    localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(resolvedProfile));
    return resolvedProfile;
  };

  const role = profile?.role || 'student';
  const isAdmin = role === 'admin';
  const isCoach = role === 'coach';
  const isStudent = role === 'student';
  const isCoachOrStudent = isCoach || isStudent;

  const switchDemoRole = async (targetRole) => {
    if (!profile) return;
    const updated = await updateProfile({ role: targetRole });
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isCoach,
        isStudent,
        isCoachOrStudent,
        switchDemoRole,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithChesscom,
        signOut,
        updateProfile,
        isSupabaseConfigured: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

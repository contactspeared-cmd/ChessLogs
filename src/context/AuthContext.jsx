import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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

  // Load profile from Supabase or Local Site Accounts
  const fetchProfile = useCallback(async (userId) => {
    // 1. Check local site accounts store first
    const siteAcc = findSiteAccountById(userId);
    if (siteAcc) {
      const safe = { ...siteAcc };
      delete safe.password_hash;
      delete safe.salt;
      return safe;
    }

    // 2. If Supabase is active, query remote profiles table
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase fetchProfile fallback:', err);
      }
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

      // 1. Try Supabase session if configured
      if (isSupabaseConfigured) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Supabase getSession timeout')), 2500)
          );
          const { data: { session } } = await Promise.race([
            supabase.auth.getSession(),
            timeoutPromise,
          ]);

          if (session?.user && mounted) {
            setUser(session.user);
            const userProfile = await fetchProfile(session.user.id);
            setProfile(userProfile);
            restored = true;
          }
        } catch (e) {
          console.warn('Supabase session initialization skipped or failed:', e?.message || e);
        }
      }

      // 2. If not restored via Supabase, restore local active profile
      if (!restored && mounted) {
        const saved = localStorage.getItem(STORAGE_KEY_LOCAL_USER);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.id) {
              // Ensure we load the freshest version from site accounts
              const fresh = findSiteAccountById(parsed.id) || parsed;
              const safe = { ...fresh };
              delete safe.password_hash;
              delete safe.salt;
              setUser({
                id: safe.id,
                email: safe.email || `${safe.chesscom_username || safe.role}@chesslogs.local`,
              });
              setProfile(safe);
              restored = true;
            }
          } catch {
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

    // Listen to Supabase auth state change if configured
    let subscription = null;
    if (isSupabaseConfigured) {
      try {
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!mounted) return;
          if (session?.user) {
            setUser(session.user);
            const p = await fetchProfile(session.user.id);
            setProfile(p);
          } else {
            const saved = localStorage.getItem(STORAGE_KEY_LOCAL_USER);
            if (!saved) {
              setUser(null);
              setProfile(null);
            }
          }
        });
        subscription = data?.subscription;
      } catch (err) {
        console.warn('Could not subscribe to Supabase auth state change:', err);
      }
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign in with email & password
  const signInWithEmail = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Try Site Account verification first (fast, reliable, offline-capable)
    try {
      const siteResult = await verifySiteCredentials(cleanEmail, password);
      if (siteResult?.user && siteResult?.profile) {
        setUser(siteResult.user);
        setProfile(siteResult.profile);
        localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(siteResult.profile));
        return siteResult;
      }
    } catch (siteErr) {
      // If site account wasn't found or password wrong, check if Supabase is active
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (!error && data?.user) {
            setUser(data.user);
            const p = await fetchProfile(data.user.id);
            setProfile(p);
            if (p) {
              localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(p));
            }
            return data;
          }
        } catch (supaErr) {
          console.warn('Supabase signInWithPassword fallback error:', supaErr);
        }
      }
      // Re-throw the clean error from site account check
      throw siteErr;
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

    // 2. Create native site account
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

    // 3. Best-effort mirror into Supabase Auth if reachable
    if (isSupabaseConfigured) {
      try {
        const { data: supaData, error: supaErr } = await supabase.auth.signUp({
          email: siteUser.email,
          password,
          options: {
            data: {
              first_name: siteProfile.first_name,
              middle_initial: siteProfile.middle_initial,
              last_name: siteProfile.last_name,
              suffix: siteProfile.suffix,
              date_of_birth: siteProfile.date_of_birth,
              full_name: siteProfile.display_name,
              display_name: siteProfile.display_name,
              chesscom_username: siteProfile.chesscom_username,
              role: 'student',
            },
          },
        });

        if (!supaErr && supaData?.user) {
          // If Supabase created a user with a different ID, we can optionally link it
          await supabase.from('profiles').upsert({
            id: supaData.user.id,
            first_name: siteProfile.first_name,
            middle_initial: siteProfile.middle_initial,
            last_name: siteProfile.last_name,
            suffix: siteProfile.suffix,
            date_of_birth: siteProfile.date_of_birth,
            display_name: siteProfile.display_name,
            chesscom_username: siteProfile.chesscom_username,
            role: 'student',
          });
        }
      } catch (supaErr) {
        console.warn('Could not mirror account to Supabase (site account remains fully active):', supaErr);
      }
    }

    // 4. Set active user & profile in React context & storage
    setUser(siteUser);
    setProfile(siteProfile);
    localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(siteProfile));

    return { user: siteUser, profile: siteProfile, session: true };
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

    // Check if an existing site account has this Chess.com username
    const allAccounts = getSiteAccounts();
    const existing = allAccounts.find(
      (a) => a.chesscom_username && a.chesscom_username.toLowerCase() === cleanUsername
    );
    if (existing) {
      finalProfile = { ...existing };
      delete finalProfile.password_hash;
      delete finalProfile.salt;
      finalId = existing.id;
    }

    // Register in local students storage so coach command center sees them
    try {
      const STORAGE_STUDENTS = 'chesslogs_students';
      const existingStudents = JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || '[]');
      const studentIdx = existingStudents.findIndex(
        (s) =>
          s.id === finalProfile.id ||
          (s.chesscom_username && s.chesscom_username.toLowerCase() === cleanUsername)
      );
      if (studentIdx >= 0) {
        existingStudents[studentIdx] = { ...existingStudents[studentIdx], ...finalProfile };
      } else {
        existingStudents.push(finalProfile);
      }
      localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(existingStudents));
    } catch (e) {
      console.warn('Failed to update local storage students:', e);
    }

    const sessionUser = {
      id: finalProfile.id,
      email: finalProfile.email || `${cleanUsername}@chess.com`,
    };

    setUser(sessionUser);
    setProfile(finalProfile);
    localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(finalProfile));
    return { user: sessionUser, profile: finalProfile };
  };

  // Google OAuth
  const signInWithGoogle = async () => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: import.meta.env.VITE_REDIRECT_URL || `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      return data;
    } else {
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
    }
  };

  // Sign out
  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore sign out errors
      }
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem(STORAGE_KEY_LOCAL_USER);
  };

  // Update profile
  const updateProfile = async (updates) => {
    if (!profile) return null;

    // 1. Update in site accounts store
    const updated = updateSiteAccount(profile.id, updates);
    const resolvedProfile = updated || {
      ...profile,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // 2. Best-effort Supabase update if configured
    if (isSupabaseConfigured && user) {
      try {
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
      } catch (err) {
        console.warn('Supabase profile update skipped/failed:', err);
      }
    }

    setProfile(resolvedProfile);
    localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(resolvedProfile));
    return resolvedProfile;
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithChesscom,
        signOut,
        updateProfile,
        isSupabaseConfigured,
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

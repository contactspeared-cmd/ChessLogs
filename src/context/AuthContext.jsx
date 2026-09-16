import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEMO_PROFILES } from '../data/initialData';
import { fetchChesscomProfile } from '../lib/chesscom';

const AuthContext = createContext(null);

const STORAGE_KEY_LOCAL_USER = 'chesslogs_active_profile';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load profile from Supabase given a user ID
  const fetchProfile = useCallback(async (userId) => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Error fetching Supabase profile:', err);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            setUser(session.user);
            const userProfile = await fetchProfile(session.user.id);
            setProfile(userProfile);
          } else {
            // Restore local session (e.g. Chess.com player login) if present
            const saved = localStorage.getItem(STORAGE_KEY_LOCAL_USER);
            if (saved && mounted) {
              try {
                const parsed = JSON.parse(saved);
                setUser({ id: parsed.id, email: parsed.email || `${parsed.chesscom_username || parsed.role}@chesslogs.local` });
                setProfile(parsed);
              } catch {
                setUser(null);
                setProfile(null);
              }
            } else if (mounted) {
              setUser(null);
              setProfile(null);
            }
          }
        } catch (e) {
          console.error('Failed to get Supabase session:', e);
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
        }
      } else {
        const saved = localStorage.getItem(STORAGE_KEY_LOCAL_USER);
        if (saved && mounted) {
          try {
            const parsed = JSON.parse(saved);
            setUser({ id: parsed.id, email: parsed.email || `${parsed.chesscom_username || parsed.role}@chesslogs.local` });
            setProfile(parsed);
          } catch {
            setUser(null);
            setProfile(null);
          }
        } else if (mounted) {
          // No auto-login: user must sign in deliberately
          setUser(null);
          setProfile(null);
        }
      }

      if (mounted) setLoading(false);
    }

    initialize();

    // Listen to Supabase auth state change if configured
    let subscription = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        } else {
          // Only clear if active profile is not a local Chess.com player
          const saved = localStorage.getItem(STORAGE_KEY_LOCAL_USER);
          if (!saved) {
            setUser(null);
            setProfile(null);
          }
        }
      });
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign in with email & password
  const signInWithEmail = async (email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user);
      const p = await fetchProfile(data.user.id);
      setProfile(p);
      return data;
    } else {
      // Local demo sign in
      const role = email.toLowerCase().includes('admin') || email.toLowerCase().includes('coach') ? 'admin' : 'student';
      const matched = DEMO_PROFILES.find((p) => p.role === role) || DEMO_PROFILES[1];
      setUser({ id: matched.id, email });
      setProfile(matched);
      localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(matched));
      return { user: { id: matched.id, email } };
    }
  };

  // Sign up with email & password (public signup is always student)
  const signUpWithEmail = async (email, password, displayName, _role = 'student') => {
    const role = 'student';
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: displayName, role },
        },
      });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        if (data.session) {
          // create or fetch profile
          const { data: prof } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              display_name: displayName,
              role,
            })
            .select()
            .single();
          setProfile(prof);
        }
      }
      return data;
    } else {
      const newProfile = {
        id: `user-${Date.now()}`,
        role,
        display_name: displayName || 'New Student',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        chesscom_username: '',
        bio: '',
        created_at: new Date().toISOString(),
      };
      setUser({ id: newProfile.id, email });
      setProfile(newProfile);
      localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(newProfile));
      return { user: { id: newProfile.id, email } };
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

    let finalId = `chesscom-${cleanUsername}`;
    let finalProfile = {
      id: finalId,
      role: 'student',
      display_name: liveProfile.name || cleanUsername,
      avatar_url:
        liveProfile.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      chesscom_username: cleanUsername,
      bio: liveProfile.location ? `Chess.com member from ${liveProfile.location}` : '',
      created_at: new Date().toISOString(),
    };

    // If Supabase is configured, create/sync Supabase Auth user and Profile
    if (isSupabaseConfigured) {
      const authEmail = `${cleanUsername}@chess.com`;
      const authPassword = `ChessLogs@${cleanUsername}!2026`;

      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        let authUser = signInData?.user;

        if (signInError || !authUser) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: {
              data: {
                full_name: liveProfile.name || cleanUsername,
                role: 'student',
                avatar_url: liveProfile.avatar || null,
                chesscom_username: cleanUsername,
              },
            },
          });

          if (!signUpError && signUpData?.user) {
            authUser = signUpData.user;
          }
        }

        if (authUser) {
          finalId = authUser.id;
          finalProfile.id = authUser.id;

          const { data: profData, error: profError } = await supabase
            .from('profiles')
            .upsert({
              id: authUser.id,
              display_name: liveProfile.name || cleanUsername,
              avatar_url: liveProfile.avatar || null,
              chesscom_username: cleanUsername,
              bio: liveProfile.location ? `Chess.com member from ${liveProfile.location}` : '',
              role: 'student',
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!profError && profData) {
            finalProfile = profData;
          }
        }
      } catch (err) {
        console.warn('Could not sync Chess.com user to Supabase Auth, using local session:', err);
      }
    }

    // Always register in local students storage so coach command center sees them
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
      email: `${cleanUsername}@chess.com`,
    };

    setUser(sessionUser);
    setProfile(finalProfile);
    localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(finalProfile));
    return { user: sessionUser, profile: finalProfile };
  };

  // Google OAuth
  const signInWithGoogle = async () => {
    if (isSupabaseConfigured) {
      // Check if Google provider is enabled in Supabase to give clear feedback
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
          headers: { apikey: supabaseAnonKey },
        });
        if (res.ok) {
          const settings = await res.json();
          if (settings?.external && settings.external.google === false) {
            throw new Error(
              'Google Sign-In is not enabled yet in your Supabase project dashboard. Please enable Google under Authentication > Providers in Supabase, or sign in using your Email or Chess.com username below.'
            );
          }
        }
      } catch (err) {
        if (err.message?.includes('Google Sign-In is not enabled')) {
          throw err;
        }
      }

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

    const updatedProfile = { ...profile, ...updates, updated_at: new Date().toISOString() };

    if (isSupabaseConfigured && user) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      return data;
    } else {
      setProfile(updatedProfile);
      localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(updatedProfile));
      return updatedProfile;
    }
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

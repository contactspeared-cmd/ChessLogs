import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEMO_PROFILES } from '../data/initialData';

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
          }
        } catch (e) {
          console.error('Failed to get Supabase session:', e);
        }
      } else {
        // Fallback demo storage mode
        const saved = localStorage.getItem(STORAGE_KEY_LOCAL_USER);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setUser({ id: parsed.id, email: `${parsed.role}@chesslogs.local` });
            setProfile(parsed);
          } catch {
            // fallback to default student
            const def = DEMO_PROFILES[1];
            setUser({ id: def.id, email: `${def.role}@chesslogs.local` });
            setProfile(def);
          }
        } else {
          // Default start as Coach for exploration
          const def = DEMO_PROFILES[0];
          setUser({ id: def.id, email: 'coach@chesslogs.local' });
          setProfile(def);
          localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(def));
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
          setUser(null);
          setProfile(null);
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

  // Google OAuth
  const signInWithGoogle = async () => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      return data;
    } else {
      return signInWithEmail('google.user@chesslogs.local', 'mock');
    }
  };

  // Sign out
  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem(STORAGE_KEY_LOCAL_USER);
  };

  // Quick switch role (Admin Coach <-> Student) for convenient testing
  const switchDemoRole = (role) => {
    const matched = DEMO_PROFILES.find((p) => p.role === role) || DEMO_PROFILES[0];
    setUser({ id: matched.id, email: `${role}@chesslogs.local` });
    setProfile(matched);
    localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(matched));
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
        signOut,
        updateProfile,
        switchDemoRole,
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

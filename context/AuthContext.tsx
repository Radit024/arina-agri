'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { DEVELOPMENT_ACCESS_TOKEN, DEVELOPMENT_USER_ID } from '@/lib/devAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ─── AUTH BYPASS FOR DEVELOPMENT ──────────────────────────────────
    if (process.env.NODE_ENV === 'development') {
      const mockUser: any = {
        id: DEVELOPMENT_USER_ID,
        email: 'developer@arinaagri.com',
        user_metadata: { full_name: 'Arina Developer' },
      };
      const mockSession: any = {
        access_token: DEVELOPMENT_ACCESS_TOKEN,
        user: mockUser,
      };
      
      setUser(mockUser);
      setSession(mockSession);
      localStorage.setItem('arina_user_id', mockUser.id);
      setLoading(false);
      return; // Skip Supabase auth listeners
    }
    // ──────────────────────────────────────────────────────────────────

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Sync userId to localStorage for offline fallback
      if (session?.user) {
        localStorage.setItem('arina_user_id', session.user.id);
      } else {
        localStorage.removeItem('arina_user_id');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ user, session, loading }), [user, session, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

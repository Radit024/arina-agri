'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  activateLocalDevelopmentAuth,
  ARINA_USER_ID_STORAGE_KEY,
  buildDevelopmentAccessToken,
  clearDevelopmentAuthMode,
  clearLocalDevelopmentAuth,
  readLocalDevelopmentUserId,
} from '@/lib/devAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuestMode: boolean;
  startLocalSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const noopAsync = async () => {};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isGuestMode: false,
  startLocalSession: noopAsync,
  signOut: noopAsync,
});

function buildLocalUser(userId: string) {
  return {
    id: userId,
    email: 'local@arinaagri.dev',
    user_metadata: { full_name: 'Akun Demo' },
  } as unknown as User;
}

function buildLocalSession(user: User) {
  return {
    access_token: buildDevelopmentAccessToken(user.id),
    user,
  } as unknown as Session;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const applySupabaseSession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (nextSession?.user) {
      clearDevelopmentAuthMode();
      localStorage.setItem(ARINA_USER_ID_STORAGE_KEY, nextSession.user.id);
      if (typeof document !== 'undefined') {
        document.cookie = 'arina_guest_session=; path=/; max-age=0; SameSite=Lax';
      }
    } else {
      localStorage.removeItem(ARINA_USER_ID_STORAGE_KEY);
    }
  }, []);

  const applyLocalDevelopmentSession = useCallback((preferredUserId?: string | null) => {
    const localUserId = preferredUserId ?? activateLocalDevelopmentAuth();

    if (!localUserId) {
      setSession(null);
      setUser(null);
      return;
    }

    if (typeof document !== 'undefined') {
      document.cookie = 'arina_guest_session=1; path=/; max-age=604800; SameSite=Lax';
    }

    const localUser = buildLocalUser(localUserId);
    setUser(localUser);
    setSession(buildLocalSession(localUser));
  }, []);

  const startLocalSession = useCallback(async () => {
    const localUserId = activateLocalDevelopmentAuth();
    if (!localUserId) return;

    await supabase.auth.signOut();
    applyLocalDevelopmentSession(localUserId);
    setLoading(false);
  }, [applyLocalDevelopmentSession]);

  const signOut = useCallback(async () => {
    clearLocalDevelopmentAuth();
    sessionStorage.clear();
    if (typeof document !== 'undefined') {
      document.cookie = 'arina_guest_session=; path=/; max-age=0; SameSite=Lax';
    }
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;

      if (session) {
        applySupabaseSession(session);
      } else {
        const localUserId = readLocalDevelopmentUserId();
        if (localUserId) {
          applyLocalDevelopmentSession(localUserId);
        } else {
          applySupabaseSession(null);
        }
      }

      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        applySupabaseSession(session);
      } else {
        const localUserId = readLocalDevelopmentUserId();
        if (localUserId) {
          applyLocalDevelopmentSession(localUserId);
        } else {
          applySupabaseSession(null);
        }
      }

      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applyLocalDevelopmentSession, applySupabaseSession]);

  const isGuestMode = user?.email === 'local@arinaagri.dev';

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isGuestMode,
    startLocalSession,
    signOut,
  }), [loading, session, signOut, startLocalSession, user, isGuestMode]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

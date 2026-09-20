// src/app/AuthContext.tsx

import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {Session, User} from '@supabase/supabase-js';
import {supabase} from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    fullName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({data, error}) => {
      if (!isMounted) return;

      if (error) {
        console.warn('AuthContext: getSession error', error);
        setSession(null);
        setIsLoading(false);
        return;
      }

      setSession(data.session ?? null);
      setIsLoading(false);
    });

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session?.user,
      isLoading,
      login: async (email: string, password: string) => {
        const {error} = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }
      },
      register: async ({
        email,
        password,
        fullName,
      }: {
        email: string;
        password: string;
        fullName: string;
      }) => {
        const {data, error} = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        const userId = data.user?.id;

        if (userId) {
          await supabase
            .from('profiles')
            .update({
              full_name: fullName.trim(),
            })
            .eq('id', userId);
        }
      },
      logout: async () => {
        const {error} = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
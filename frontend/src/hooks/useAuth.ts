'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useCallback } from 'react';
import type { UserRole } from '@/types';

interface LoginParams {
  email: string;
  password: string;
}

export function useAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const user = session?.user ?? null;

  const login = useCallback(
    async (params: LoginParams) => {
      const result = await signIn('credentials', {
        email: params.email,
        password: params.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      return result;
    },
    [],
  );

  const logout = useCallback(async () => {
    await signOut({ redirect: true, callbackUrl: '/auth/login' });
  }, []);

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!user?.role) return false;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      return allowedRoles.includes(user.role as UserRole);
    },
    [user?.role],
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
  };
}

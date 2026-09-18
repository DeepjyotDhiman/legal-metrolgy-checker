import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthContextValue, TokenResponse } from '../types/auth';
import authService from '../services/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TokenResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, probe /me to restore session from cookie.
  // /me returns UserResponse: { id, name, email, role, is_active, created_at }
  useEffect(() => {
    authService
      .me()
      .then((profile) => {
        setUser({
          message: '',
          user_id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
        });
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to consume AuthContext. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

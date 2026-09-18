import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthContextValue, TokenResponse } from '../types/auth';
import authService from '../services/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TokenResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, probe /me to restore session from cookie
  useEffect(() => {
    authService
      .me()
      .then((session) => {
        // me() returns SessionUser; synthesise enough for TokenResponse
        setUser({
          message: '',
          user_id: session.user_id,
          email: session.email,
          name: '',
          role: session.role,
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

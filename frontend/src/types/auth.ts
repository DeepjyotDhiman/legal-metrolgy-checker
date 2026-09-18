// ── Auth / User types ─────────────────────────────────────────────────────────
// Mirrors backend schemas: token.py, user.py, enums.py

export type UserRole = 'ADMIN' | 'OFFICER';

export interface LoginRequest {
  email: string;
  password: string;
}

/** Returned by POST /api/auth/login */
export interface TokenResponse {
  message: string;
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
}

/** Returned by GET /api/auth/me */
export interface SessionUser {
  user_id: string;
  email: string;
  role: UserRole;
}

/** Full user profile */
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string; // ISO-8601
}

/** Auth context shape used by the React app */
export interface AuthContextValue {
  user: TokenResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

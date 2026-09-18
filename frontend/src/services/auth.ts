import apiClient from './api';
import type { LoginRequest, TokenResponse, UserResponse } from '../types/auth';

const AUTH_PREFIX = '/api/auth';

/**
 * Auth service — all authentication API calls go through here.
 * Backend uses HTTP-only session cookies; no token management in JS.
 */
const authService = {
  /**
   * POST /api/auth/login
   * Submits credentials. On success the backend sets a session cookie.
   */
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const payload: LoginRequest = { email, password };
    const { data } = await apiClient.post<TokenResponse>(`${AUTH_PREFIX}/login`, payload);
    return data;
  },

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user from the session cookie.
   * Backend returns UserResponse: { id, name, email, role, is_active, created_at }
   * We map 'id' → 'user_id' in useAuth.tsx since UserResponse uses 'id'.
   */
  me: async (): Promise<UserResponse> => {
    const { data } = await apiClient.get<UserResponse>(`${AUTH_PREFIX}/me`);
    return data;
  },

  /**
   * POST /api/auth/logout
   * Clears the server-side session and the cookie.
   */
  logout: async (): Promise<void> => {
    await apiClient.post(`${AUTH_PREFIX}/logout`);
  },

  /**
   * POST /api/auth/register
   * Registers a new officer account awaiting administrator approval.
   */
  register: async (name: string, email: string, password: string): Promise<{ message: string; id: string; email: string }> => {
    const { data } = await apiClient.post(`${AUTH_PREFIX}/register`, { name, email, password });
    return data;
  },
};

export default authService;

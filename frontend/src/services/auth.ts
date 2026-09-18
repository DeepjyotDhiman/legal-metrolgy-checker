import apiClient from './api';
import type { LoginRequest, TokenResponse, SessionUser } from '../types/auth';

const AUTH_PREFIX = '/api/v1/auth';

/**
 * Auth service — all authentication API calls go through here.
 * Backend uses HTTP-only session cookies; no token management in JS.
 */
const authService = {
  /**
   * POST /api/v1/auth/login
   * Submits credentials. On success the backend sets a session cookie.
   */
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const payload: LoginRequest = { email, password };
    const { data } = await apiClient.post<TokenResponse>(`${AUTH_PREFIX}/login`, payload);
    return data;
  },

  /**
   * GET /api/v1/auth/me
   * Returns the currently authenticated user from the session cookie.
   * Throws 401 if not authenticated.
   */
  me: async (): Promise<SessionUser> => {
    const { data } = await apiClient.get<SessionUser>(`${AUTH_PREFIX}/me`);
    return data;
  },

  /**
   * POST /api/v1/auth/logout
   * Clears the server-side session and the cookie.
   */
  logout: async (): Promise<void> => {
    await apiClient.post(`${AUTH_PREFIX}/logout`);
  },
};

export default authService;

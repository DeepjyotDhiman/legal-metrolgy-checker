import apiClient from './api';
import type { UserResponse } from '../types/auth';

const USERS_PREFIX = '/api/users';

const usersService = {
  /**
   * GET /api/users
   * Lists all users, optionally filtered by status ('active', 'pending') or role.
   */
  list: async (params?: { status?: string; role?: string }): Promise<UserResponse[]> => {
    const { data } = await apiClient.get<UserResponse[]>(USERS_PREFIX, { params });
    return data;
  },

  /**
   * GET /api/users/pending
   * Lists users waiting for administrator activation.
   */
  listPending: async (): Promise<UserResponse[]> => {
    const { data } = await apiClient.get<UserResponse[]>(`${USERS_PREFIX}/pending`);
    return data;
  },

  /**
   * POST /api/users/:id/approve
   * Activates a pending officer user account.
   */
  approve: async (userId: string): Promise<UserResponse> => {
    const { data } = await apiClient.post<UserResponse>(`${USERS_PREFIX}/${userId}/approve`);
    return data;
  },

  /**
   * POST /api/users/:id/reject
   * Rejects and deactivates a user account.
   */
  reject: async (userId: string): Promise<{ message: string; user_id: string }> => {
    const { data } = await apiClient.post<{ message: string; user_id: string }>(
      `${USERS_PREFIX}/${userId}/reject`,
    );
    return data;
  },

  /**
   * POST /api/users/:id/deactivate
   * Deactivates an active user account.
   */
  deactivate: async (userId: string): Promise<UserResponse> => {
    const { data } = await apiClient.post<UserResponse>(`${USERS_PREFIX}/${userId}/deactivate`);
    return data;
  },
};

export default usersService;

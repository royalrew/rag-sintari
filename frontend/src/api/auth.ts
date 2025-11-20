/**
 * Auth API
 * Handles authentication operations
 */

import { apiPost, apiGet } from './client';
import { apiRoutes } from '@/config/apiRoutes';

export interface User {
  id: string | number; // Backend returns number, but we convert to string for consistency
  name: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
}

/**
 * Login user
 * POST /auth/login
 * Body: { email, password }
 * Returns: User object and access token
 */
export const login = async (request: LoginRequest): Promise<LoginResponse> => {
  const response = await apiPost<{ user: { id: number; name: string; email: string; created_at: string }; accessToken: string }>(apiRoutes.auth.login, request);
  
  // Store token in localStorage for client.ts to use
  localStorage.setItem('accessToken', response.accessToken);
  
  // Convert id to string for consistency
  return {
    user: {
      id: response.user.id.toString(),
      name: response.user.name,
      email: response.user.email,
    },
    accessToken: response.accessToken,
  };
};

/**
 * Register new user
 * POST /auth/register
 * Body: { name, email, password }
 * Returns: User object and access token
 */
export const register = async (request: RegisterRequest): Promise<RegisterResponse> => {
  const response = await apiPost<{ user: { id: number; name: string; email: string; created_at: string }; accessToken: string }>(apiRoutes.auth.register, request);
  
  // Store token in localStorage for client.ts to use
  localStorage.setItem('accessToken', response.accessToken);
  
  // Convert id to string for consistency
  return {
    user: {
      id: response.user.id.toString(),
      name: response.user.name,
      email: response.user.email,
    },
    accessToken: response.accessToken,
  };
};

/**
 * Get current user
 * GET /auth/me
 * Returns: Current user object
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return null;
    }
    
    const user = await apiGet<{ id: number; name: string; email: string; created_at: string }>(apiRoutes.auth.me);
    // Convert id to string for consistency with frontend
    return {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
    };
  } catch (error: any) {
    // If unauthorized, clear token and return null
    if (error.status === 401) {
      localStorage.removeItem('accessToken');
      return null;
    }
    throw error;
  }
};

/**
 * Logout user
 * POST /auth/logout
 * Returns: Success message
 */
export const logout = async (): Promise<{ success: boolean }> => {
  // TODO: Implement logout endpoint in backend if needed
  // For now, just clear local storage
  localStorage.removeItem('accessToken');
  return { success: true };
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 * Body: { email }
 * Returns: Success message
 */
export const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiPost<{ success: boolean; message: string }>(apiRoutes.auth.forgotPassword, { email });
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Återställningslänk skickad till din e-post',
      });
    }, 500);
  });
};

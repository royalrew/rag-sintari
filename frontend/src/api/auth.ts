/**
 * Auth API
 * Handles authentication operations
 */

import { apiPost, apiGet } from './client';
import { apiRoutes } from '@/config/apiRoutes';

export interface User {
  id: string;
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
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: User object and access token
 */
export const login = async (request: LoginRequest): Promise<LoginResponse> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiPost<LoginResponse>(apiRoutes.auth.login, request);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      const user: User = {
        id: '1',
        name: request.email.split('@')[0],
        email: request.email,
      };
      const accessToken = 'mock-jwt-token-' + Date.now();
      
      // Store token in localStorage for client.ts to use
      localStorage.setItem('accessToken', accessToken);
      
      resolve({ user, accessToken });
    }, 500);
  });
};

/**
 * Register new user
 * POST /api/auth/register
 * Body: { name, email, password }
 * Returns: User object and access token
 */
export const register = async (request: RegisterRequest): Promise<RegisterResponse> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiPost<RegisterResponse>(apiRoutes.auth.register, request);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      const user: User = {
        id: Date.now().toString(),
        name: request.name,
        email: request.email,
      };
      const accessToken = 'mock-jwt-token-' + Date.now();
      
      // Store token in localStorage for client.ts to use
      localStorage.setItem('accessToken', accessToken);
      
      resolve({ user, accessToken });
    }, 500);
  });
};

/**
 * Get current user
 * GET /api/auth/me
 * Returns: Current user object
 */
export const getCurrentUser = async (): Promise<User | null> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiGet<User>(apiRoutes.auth.me);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        resolve({
          id: '1',
          name: 'Jimmy',
          email: 'jimmy@example.com',
        });
      } else {
        resolve(null);
      }
    }, 100);
  });
};

/**
 * Logout user
 * POST /api/auth/logout
 * Returns: Success message
 */
export const logout = async (): Promise<{ success: boolean }> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiPost<{ success: boolean }>(apiRoutes.auth.logout);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.removeItem('accessToken');
      resolve({ success: true });
    }, 100);
  });
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

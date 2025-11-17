/**
 * API Client
 * Core HTTP client with authentication and error handling
 */

// Read base URL from Vite env; fallback to Railway production or local dev
const BASE_URL = 
  (import.meta as any).env?.VITE_RAG_API_URL || 
  'https://rag-sintari-production.up.railway.app';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get access token from localStorage
 */
const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

/**
 * Build headers with authentication
 */
const buildHeaders = (customHeaders?: Record<string, string>): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Handle API response
 */
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Map to our backend error model when present
    const message = errorData?.message || 'API request failed';
    throw new ApiError(message, response.status, {
      code: errorData?.code,
      requestId: errorData?.request_id,
      ...errorData,
    });
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

/**
 * GET request
 */
export const apiGet = async <T = any>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
    ...options,
  });

  return handleResponse(response);
};

/**
 * POST request
 */
export const apiPost = async <T = any>(
  path: string,
  data?: any,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
    ...options,
  });

  return handleResponse(response);
};

/**
 * PUT request
 */
export const apiPut = async <T = any>(
  path: string,
  data?: any,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
    ...options,
  });

  return handleResponse(response);
};

/**
 * DELETE request
 */
export const apiDelete = async <T = any>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
    ...options,
  });

  return handleResponse(response);
};

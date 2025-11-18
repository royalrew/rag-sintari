/**
 * API Client
 * Core HTTP client with authentication and error handling
 */

// Read base URL from Vite env
// In dev: defaults to localhost:8000
// In production: use Railway URL or set VITE_RAG_API_URL
const getBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_RAG_API_URL;
  if (envUrl) {
    console.log('[API Client] Using VITE_RAG_API_URL:', envUrl);
    return envUrl;
  }
  
  // Auto-detect dev mode (Vite sets this)
  const isDev = (import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development';
  const baseUrl = isDev ? 'http://localhost:8000' : 'https://rag-sintari-production.up.railway.app';
  console.log('[API Client] Auto-detected BASE_URL:', baseUrl, '(isDev:', isDev, ')');
  return baseUrl;
};

const BASE_URL = getBaseUrl();

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
    let errorData: any = {};
    try {
      const text = await response.text();
      errorData = text ? JSON.parse(text) : {};
    } catch {
      // If JSON parsing fails, use status text
      errorData = { message: response.statusText || 'API request failed' };
    }
    
    // Map to our backend error model when present
    const message = errorData?.message || errorData?.detail || `API request failed (${response.status})`;
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: buildHeaders(),
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);
    return handleResponse(response);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timeout - servern svarade inte i tid', 408, error);
    }
    throw error;
  }
};

/**
 * POST request
 */
export const apiPost = async <T = any>(
  path: string,
  data?: any,
  options?: RequestInit
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout för POST
  
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(data),
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);
    return handleResponse(response);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timeout - servern svarade inte i tid', 408, error);
    }
    // Hantera nätverksfel (t.ex. offline på mobil, CORS, etc.)
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') ||
        error.message?.includes('Network request failed')) {
      // Mer specifik felhantering
      const isCorsError = error.message?.includes('CORS') || 
                         error.message?.includes('Access-Control');
      const errorMsg = isCorsError 
        ? 'CORS-fel - backend tillåter inte denna domän. Kontrollera CORS-inställningar.'
        : 'Nätverksfel - kontrollera din internetanslutning och att backend är online.';
      throw new ApiError(errorMsg, 0, error);
    }
    throw error;
  }
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

// ============================================
// HYBRID API CLIENT
// Supports both cookie-based auth (Chrome same-origin) and
// token-based auth (Safari cross-origin, Capacitor mobile).
//
// Tokens are returned in response body by the backend and stored
// in memory + localStorage. Sent via Authorization header on
// every request, bypassing Safari ITP and Capacitor cookie issues.
// ============================================

type RequestConfig = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type ApiError = {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8443';

// --- Token Storage ---
// In-memory for speed, backed by localStorage for persistence across reloads.
// On Capacitor, you could swap localStorage for @capacitor/preferences if needed.

const TOKEN_KEYS = {
  access: 'comops-access-token',
  refresh: 'comops-refresh-token',
} as const;

let accessToken: string | null = null;
let refreshToken: string | null = null;

// Hydrate from localStorage on module load
try {
  accessToken = localStorage.getItem(TOKEN_KEYS.access);
  refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);
} catch {
  // SSR or restricted storage — ignore
}

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  try {
    localStorage.setItem(TOKEN_KEYS.access, access);
    localStorage.setItem(TOKEN_KEYS.refresh, refresh);
  } catch {
    // Storage full or unavailable
  }
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  try {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
  } catch {
    // Ignore
  }
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

class ApiClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // --- Core request ---

  private async request<T>(config: RequestConfig): Promise<T> {
    const { method, url, data, params, headers = {}, signal } = config;

    // Build URL with query params
    const fullUrl = new URL(`${this.baseURL}${url}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fullUrl.searchParams.set(key, String(value));
        }
      });
    }

    // Set content type
    const isFormData = data instanceof FormData;
    if (data && !headers['Content-Type'] && !isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Attach Authorization header if we have a token
    if (accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(fullUrl.toString(), {
        method,
        headers,
        body: data ? (isFormData ? (data as any) : JSON.stringify(data)) : undefined,
        signal,
        credentials: 'include', // Still send cookies when available (Chrome same-origin)
      });

      // Handle 401 — attempt token refresh (except when we are already trying to refresh or login)
      if (response.status === 401 && url !== '/refresh' && url !== '/login') {
        const refreshSuccess = await this.refreshAccessToken();
        if (refreshSuccess) {
          // Update the Authorization header with the new token
          headers['Authorization'] = `Bearer ${accessToken}`;

          // Retry original request
          const retryResponse = await fetch(fullUrl.toString(), {
            method,
            headers,
            body: data ? (isFormData ? (data as any) : JSON.stringify(data)) : undefined,
            signal,
            credentials: 'include',
          });

          if (!retryResponse.ok) {
            throw await this.buildError(retryResponse);
          }

          return retryResponse.json() as Promise<T>;
        }

        // Refresh failed — clear tokens and notify app
        clearTokens();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw await this.buildError(response);
      }

      if (!response.ok) {
        throw await this.buildError(response);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw {
          message: 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR',
          status: 0,
        } as ApiError;
      }
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include current access token if available (may still be valid for identity)
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        headers,
        // Send refresh token in body for Safari/Capacitor (cookies won't be sent cross-origin)
        body: JSON.stringify({ refreshToken }),
        credentials: 'include', // Still send cookies when available
      });

      if (response.ok) {
        const result = (await response.json()) as {
          data: { accessToken?: string; refreshToken?: string };
        };

        // Store new tokens from response body
        if (result.data.accessToken && result.data.refreshToken) {
          setTokens(result.data.accessToken, result.data.refreshToken);
        }
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private async buildError(response: Response): Promise<ApiError> {
    try {
      const body = (await response.json()) as {
        message?: string;
        code?: string;
        details?: Record<string, string[]>;
      };
      return {
        message: body.message || response.statusText,
        code: body.code || `HTTP_${response.status}`,
        status: response.status,
        details: body.details,
      };
    } catch {
      return {
        message: response.statusText,
        code: `HTTP_${response.status}`,
        status: response.status,
      };
    }
  }

  // --- Public HTTP methods ---

  get<T>(url: string, params?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    return this.request<T>({ method: 'GET', url, params, signal });
  }

  post<T>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>({ method: 'POST', url, data, signal });
  }

  put<T>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data, signal });
  }

  patch<T>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>({ method: 'PATCH', url, data, signal });
  }

  delete<T>(url: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>({ method: 'DELETE', url, signal });
  }
}

export const api = new ApiClient(API_BASE_URL);

// ============================================
// COOKIE-BASED API CLIENT
// Centralized HTTP client with secure cookie-based auth, refresh,
// error handling, and request/response interceptors.
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
    if (data && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(fullUrl.toString(), {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal,
        credentials: 'include', // Crucial for cookie-based auth
      });

      // Handle 401 — attempt token refresh (except when we are already trying to refresh or login)
      if (response.status === 401 && url !== '/refresh' && url !== '/login') {
        const refreshSuccess = await this.refreshAccessToken();
        if (refreshSuccess) {
          // Retry original request
          const retryResponse = await fetch(fullUrl.toString(), {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
            signal,
            credentials: 'include',
          });

          if (!retryResponse.ok) {
            throw await this.buildError(retryResponse);
          }

          return retryResponse.json() as Promise<T>;
        }

        // Refresh failed — clear local UI state and redirect
        // Emit custom event to let Zustand store or App components know to clear auth
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
      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return response.ok;
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

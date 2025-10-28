/**
 * Event-aware API client for HashPass white-label platform
 * Automatically handles event-specific API endpoints and configurations
 */

import React from 'react';
import { getCurrentEvent } from './event-detector';
import { supabase } from './supabase';

export type ApiResponse<T = any> = {
  data: T;
  error?: never;
  success: true;
} | {
  data?: T | null;
  error: string;
  success: false;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  endpoint?: string;
  params?: Record<string, any>;
}

export class EventApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retries: number;

  constructor() {
    const event = getCurrentEvent();
    // Allow overriding via public env var (Expo: EXPO_PUBLIC_*)
    const envBase = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
    if (envBase) {
      // Normalize env base: no trailing slash
      this.baseURL = envBase.endsWith('/') ? envBase.slice(0, -1) : envBase;
    } else if (event?.api?.basePath) {
      // Ensure basePath starts with a slash and doesn't end with one
      this.baseURL = event.api.basePath.startsWith('/') 
        ? event.api.basePath 
        : `/${event.api.basePath}`;
      this.baseURL = this.baseURL.endsWith('/') 
        ? this.baseURL.slice(0, -1) 
        : this.baseURL;
    } else {
      // Default to app-local /api
      this.baseURL = '/api';
    }
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    this.timeout = 10000; // 10 seconds
    this.retries = 3;
  }

  /**
   * Make an API request with automatic event endpoint resolution
   */
  async request<T = any>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    // Get the event configuration
    const event = getCurrentEvent();
    
    // Determine the base URL: env override wins, then event config, else constructor default
    const envBase = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
    const baseUrl = envBase || event?.api?.basePath || this.baseURL;
    
    // Build the final URL
    let url: string;
    
    // If an endpoint is specified in options and exists in the event config
    if (options.endpoint && event?.api?.endpoints?.[options.endpoint]) {
      const endpointPath = event.api.endpoints[options.endpoint];
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const cleanPath = endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath;
      url = `${cleanBase}/${cleanPath}`;
    } else {
      // Otherwise, build the URL from the base URL and path
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      url = `${cleanBase}/${cleanPath}`;
    }
    
    // Add query parameters if provided
    if (options.params) {
      const queryParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
      retries = this.retries
    } = options;
    
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // Add authentication header if available
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      requestHeaders['Authorization'] = `Bearer ${session.access_token}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          data,
          success: true
        };
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof Error && error.name === 'AbortError') {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      data: null,
      error: lastError?.message || 'Request failed',
      success: false
    };
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file
   */
  async upload<T = any>(endpoint: string, file: File, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const event = getCurrentEvent();
    const envBase = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
    const baseUrl = envBase || event?.api?.basePath || this.baseURL;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${cleanBase}${cleanPath}`;
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        data,
        success: true
      };
    } catch (error) {
      return {
        data: null as unknown as T,  // Type assertion to handle generic type with null
        error: (error as Error).message,
        success: false
      };
    }
  }
}

// Global API client instance
export const apiClient = new EventApiClient();

/**
 * Event-specific API methods
 */
export const eventApi = {
  // Speakers API
  speakers: {
    list: () => apiClient.get('/speakers'),
    get: (id: string) => apiClient.get(`/speakers/${id}`),
    create: (data: any) => apiClient.post('/speakers', data),
    update: (id: string, data: any) => apiClient.patch(`/speakers/${id}`, data),
    delete: (id: string) => apiClient.delete(`/speakers/${id}`),
  },

  // Bookings API
  bookings: {
    list: (params?: Record<string, any>) => {
      const query = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiClient.get(`/bookings${query}`);
    },
    get: (id: string) => apiClient.get(`/bookings/${id}`),
    create: (data: any) => apiClient.post('/bookings', data),
    update: (id: string, data: any) => apiClient.patch(`/bookings/${id}`, data),
    delete: (id: string) => apiClient.delete(`/bookings/${id}`),
  },

  // Auto-match API
  autoMatch: {
    find: (data: any) => apiClient.post('/auto-match', data),
  },

  // Ticket verification API
  tickets: {
    verify: (data: any) => apiClient.post('/verify-ticket', data),
  },

  // Analytics API
  analytics: {
    get: (params?: Record<string, any>) => {
      const query = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiClient.get(`/analytics${query}`);
    },
  },

  // Notifications API
  notifications: {
    list: () => apiClient.get('/notifications'),
    markRead: (id: string) => apiClient.patch(`/notifications/${id}`, { read: true }),
    send: (data: any) => apiClient.post('/notifications', data),
  },
};

/**
 * React hook for API calls
 */
export function useApiCall<T = any>() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const call = React.useCallback(async (
    apiCall: () => Promise<ApiResponse<T>>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.error || 'API call failed');
        return null;
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { call, loading, error };
}

/**
 * React hook for specific API endpoints
 */
export function useEventApi<T = any>(endpoint: string, options?: ApiRequestOptions) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.request<T>(endpoint, options);
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Request failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(options)]);

  React.useEffect(() => {
    if (options?.method === 'GET' || !options?.method) {
      fetchData();
    }
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

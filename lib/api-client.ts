/**
 * Event-aware API client for HashPass white-label platform
 * Automatically handles event-specific API endpoints and configurations
 */

import React from 'react';
import { getCurrentEvent, getEventApiEndpoint } from './event-detector';
import { supabase } from './supabase';

export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  success: boolean;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

export class EventApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retries: number;

  constructor() {
    const event = getCurrentEvent();
    this.baseURL = event.api.basePath;
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
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
      retries = this.retries
    } = options;

    const url = getEventApiEndpoint(endpoint);
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

    const url = getEventApiEndpoint(endpoint);
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
        data: null,
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

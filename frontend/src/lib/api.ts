// lib/api.ts - API client utilities
// Handles HTTP requests to the backend API with authentication.

import axios from 'axios';

// Backend base URL. Configurable at build/run time via NEXT_PUBLIC_API_URL
// (set by start.sh). Falls back to the local dev server.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add token to requests only when running in the browser.
api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const token = window.localStorage.getItem('token');
  if (!token) {
    return config;
  }

  const requestHeaders = config.headers ?? {};
  if (requestHeaders && typeof requestHeaders === 'object' && 'set' in requestHeaders) {
    (requestHeaders as { set: (name: string, value: string) => void }).set('Authorization', `Bearer ${token}`);
  } else {
    (requestHeaders as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  config.headers = requestHeaders;
  return config;
});

export default api;
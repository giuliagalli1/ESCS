// lib/api.ts - API client utilities
// Handles HTTP requests to the backend API with authentication.

import axios from 'axios';

// Backend base URL. Configurable at build/run time via NEXT_PUBLIC_API_URL
// (set by start.sh). Falls back to the local dev server.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
/**
 * Resolves the backend server base URL.
 * In production (e.g. Vercel), uses VITE_SERVER_URL environment variable.
 * In development on Vite (port 5173), points to the same hostname on port 3000.
 */
export const getApiBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL.replace(/\/+$/, '');
  }
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Builds a full API endpoint URL.
 * @param {string} path - e.g. '/api/v1/rooms'
 * @returns {string} - full URL or relative path
 */
export const apiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

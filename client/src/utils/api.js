/**
 * Resolves the backend server base URL.
 * In production (e.g. Vercel), uses VITE_SERVER_URL environment variable.
 * In development on Vite (port 5173), points to the same hostname on port 3000.
 */
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
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

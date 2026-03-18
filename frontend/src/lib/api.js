// API Configuration - Works in both Emergent preview and Vercel production
// In Vercel production: uses relative paths (/api/...)
// In Emergent preview: uses REACT_APP_BACKEND_URL

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// If BACKEND_URL is empty or we're on Vercel, use relative paths
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Log for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('[LeadHunter] API_BASE:', API_BASE);
  console.log('[LeadHunter] BACKEND_URL:', BACKEND_URL || '(relative paths)');
}

export default API_BASE;

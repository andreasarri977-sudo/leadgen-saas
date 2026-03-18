// API Configuration - Works in both Emergent preview and Vercel production
// REACT_APP_BACKEND_URL must be set in Vercel Environment Variables

// Detect if running on Vercel
const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

// Get backend URL from environment or use fallback for Vercel
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (isVercel ? 'https://saas-migration-4.preview.emergentagent.com' : '');

// Use the backend URL if provided, otherwise fall back to relative paths
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Always log for debugging
console.log('[LeadHunter] API_BASE:', API_BASE);
console.log('[LeadHunter] BACKEND_URL:', BACKEND_URL || '(using relative paths)');
console.log('[LeadHunter] isVercel:', isVercel);
console.log('[LeadHunter] ENV REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL || 'NOT SET');

// Export helper for constructing full API URLs
export const getApiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
};

export default API_BASE;

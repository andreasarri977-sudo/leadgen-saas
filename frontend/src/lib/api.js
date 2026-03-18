// API Configuration - Works in both Emergent preview and Vercel production
// In Vercel production: uses relative paths (/api/...) which route to Vercel Functions
// In Emergent preview: uses REACT_APP_BACKEND_URL

// Get the backend URL from environment
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Use relative paths for Vercel production (empty BACKEND_URL)
// Use full URL for Emergent preview
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Log for debugging
console.log('[LeadHunter] API_BASE:', API_BASE);
console.log('[LeadHunter] REACT_APP_BACKEND_URL:', BACKEND_URL || '(empty - using /api)');

export default API_BASE;

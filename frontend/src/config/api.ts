// API Configuration
// REACT_APP_BACKEND_URL = bare backend origin, e.g. https://your-backend.railway.app
// REACT_APP_API_URL     = API base with /api,    e.g. https://your-backend.railway.app/api
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const API_BASE_URL = process.env.REACT_APP_API_URL || `${BACKEND_URL}/api`;

export { API_BASE_URL, BACKEND_URL };
export default API_BASE_URL;
// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export { API_BASE_URL };

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_TOKEN: '/auth/verify',
  
  // Users
  USERS: '/users',
  USER_PROFILE: '/users/profile',
  UPDATE_PROFILE: '/users/profile',
  
  // Courses
  COURSES: '/courses',
  COURSE_BY_ID: (id: string) => `/courses/${id}`,
  ENROLL_COURSE: (id: string) => `/courses/${id}/enroll`,
  COURSE_CONTENT: (id: string) => `/courses/${id}/content`,
  
  // Assignments
  ASSIGNMENTS: '/assignments',
  ASSIGNMENT_BY_ID: (id: string) => `/assignments/${id}`,
  SUBMIT_ASSIGNMENT: (id: string) => `/assignments/${id}/submit`,
  ASSIGNMENT_SUBMISSIONS: (id: string) => `/assignments/${id}/submissions`,
  
  // Chat
  CHAT_ROOMS: '/chat/rooms',
  CHAT_ROOM_BY_ID: (id: string) => `/chat/rooms/${id}`,
  CHAT_MESSAGES: (roomId: string) => `/chat/rooms/${roomId}/messages`,
  CREATE_CHAT_ROOM: '/chat/rooms',
  JOIN_CHAT_ROOM: (id: string) => `/chat/rooms/${id}/join`,
  
  // Calls
  CALL_HISTORY: '/calls/history',
  CALL_STATS: '/calls/stats',
  CALL_RECORD: '/calls/record',
  CALL_BY_ID: (callId: string) => `/calls/${callId}`,
  CALL_DELETE: (callId: string) => `/calls/${callId}`,
  
  // Dashboard
  DASHBOARD_STATS: '/dashboard/stats',
  DASHBOARD_RECENT_ACTIVITY: '/dashboard/recent-activity',
  
  // Leaderboard
  LEADERBOARD: '/leaderboard',
  LEADERBOARD_USER_RANK: '/leaderboard/user-rank',
  
  // Analytics
  ANALYTICS_OVERVIEW: '/analytics/overview',
  ANALYTICS_COURSE: (courseId: string) => `/analytics/course/${courseId}`,
  
  // Gamification
  GAMIFICATION_ACHIEVEMENTS: '/gamification/achievements',
  GAMIFICATION_BADGES: '/gamification/badges',
  
  // Quizzes
  QUIZZES: '/quizzes',
  QUIZ_BY_ID: (id: string) => `/quizzes/${id}`,
  QUIZ_SUBMIT: (id: string) => `/quizzes/${id}/submit`,
  
  // Profile
  PROFILE: '/profile',
  UPDATE_AVATAR: '/profile/avatar',
  UPDATE_PASSWORD: '/profile/password',
  
  // Test
  TEST_CONNECTION: '/test/connection',
  TEST_DB: '/test/database'
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function for authenticated requests
export const getAuthHeaders = (): { Authorization: string } => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`
  };
};

// Common request configurations
export const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
};

export const API_CONFIG_WITH_AUTH = {
  ...API_CONFIG,
  headers: {
    ...API_CONFIG.headers,
    ...getAuthHeaders(),
  },
};

const apiExports = {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl,
  getAuthHeaders,
  API_CONFIG,
  API_CONFIG_WITH_AUTH
};

export default apiExports;
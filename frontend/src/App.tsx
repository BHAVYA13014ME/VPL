import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider as CustomThemeProvider, useTheme as useCustomTheme } from './contexts/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import Courses from './pages/courses/Courses';
import CourseDetail from './pages/courses/CourseDetail';
import Assignments from './pages/assignments/Assignments';
import AssignmentDetail from './pages/assignments/AssignmentDetail';
import CreateAssignment from './pages/assignments/CreateAssignment';
import TeacherCourseManager from './pages/teacher/TeacherCourseManager';
import CreateQuiz from './pages/quizzes/CreateQuiz';
import WhatsAppChat from './pages/chat/WhatsAppChat';
import Profile from './pages/Profile';
import Analytics from './pages/analytics/Analytics';
import Leaderboard from './pages/leaderboard/Leaderboard';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ResetPassword from './pages/auth/ResetPassword';
import OAuthCallback from './pages/auth/OAuthCallback';
import './styles/themes.css';

const AppContent = () => {
  const { theme: customTheme } = useCustomTheme();

  const muiTheme = useMemo(() => {
    const isDark = customTheme === 'dark';

    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: {
          main: '#d97534',
          light: '#e8905a',
          dark: '#c06420',
          contrastText: '#ffffff',
        },
        secondary: {
          main: '#4facfe',
          light: '#7ec8ff',
          dark: '#2a8de0',
          contrastText: '#ffffff',
        },
        background: {
          default: isDark ? '#111827' : '#f4f6fa',
          paper: isDark ? '#1e2940' : '#ffffff',
        },
        text: {
          primary: isDark ? '#e8dcc4' : '#1a2332',
          secondary: isDark ? 'rgba(232, 220, 196, 0.65)' : '#4a5568',
        },
        divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        error: { main: '#ff6b6b' },
        success: { main: '#51cf66' },
        warning: { main: '#ffd43b' },
        info: { main: '#4facfe' },
      },
      typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 700, letterSpacing: '-1px' },
        h2: { fontWeight: 700, letterSpacing: '-0.5px' },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { fontWeight: 600 },
      },
      shape: { borderRadius: 10 },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              background: isDark
                ? 'linear-gradient(135deg, #111827 0%, #1a2332 100%)'
                : '#f4f6fa',
              minHeight: '100vh',
            },
            '*::-webkit-scrollbar': { width: '6px', height: '6px' },
            '*::-webkit-scrollbar-track': { background: 'transparent' },
            '*::-webkit-scrollbar-thumb': {
              background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              borderRadius: '3px',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: 8,
              fontWeight: 600,
              letterSpacing: '0.01em',
            },
            containedPrimary: {
              background: 'linear-gradient(135deg, #d97534 0%, #c06420 100%)',
              boxShadow: '0 4px 14px rgba(217, 117, 52, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #c06420 0%, #a8551a 100%)',
                boxShadow: '0 6px 20px rgba(217, 117, 52, 0.5)',
                transform: 'translateY(-1px)',
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 14,
              backgroundImage: 'none',
              boxShadow: isDark
                ? '0 4px 20px rgba(0,0,0,0.4)'
                : '0 2px 12px rgba(0,0,0,0.08)',
              border: isDark
                ? '1px solid rgba(255,255,255,0.07)'
                : '1px solid rgba(0,0,0,0.06)',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              border: isDark
                ? '1px solid rgba(255,255,255,0.07)'
                : '1px solid rgba(0,0,0,0.06)',
            },
          },
        },
        MuiTextField: {
          defaultProps: { variant: 'outlined' as const },
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
              },
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: { borderRadius: 6 },
          },
        },
        MuiAvatar: {
          styleOverrides: {
            root: {
              background: isDark
                ? 'linear-gradient(135deg, #d97534, #e8905a)'
                : 'linear-gradient(135deg, #d97534, #e8905a)',
            },
          },
        },
      },
    });
  }, [customTheme]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Routes>
              {/* Public Routes - Landing page first */}
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/forgot-password" element={<ResetPassword />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/admin/*" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/teacher/*" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/student/*" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/courses" element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              } />
              
              <Route path="/courses/:id" element={
                <ProtectedRoute>
                  <CourseDetail />
                </ProtectedRoute>
              } />
              
              <Route path="/courses/:id/manage" element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <TeacherCourseManager />
                </ProtectedRoute>
              } />
              
              <Route path="/assignments" element={
                <ProtectedRoute>
                  <Assignments />
                </ProtectedRoute>
              } />
              
              <Route path="/assignments/create" element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <CreateAssignment />
                </ProtectedRoute>
              } />
              
              <Route path="/assignments/:id" element={
                <ProtectedRoute>
                  <AssignmentDetail />
                </ProtectedRoute>
              } />
              
              <Route path="/quizzes/create" element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <CreateQuiz />
                </ProtectedRoute>
              } />
              
              <Route path="/chat" element={
                <ProtectedRoute>
                  <WhatsAppChat />
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              <Route path="/analytics" element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <Analytics />
                </ProtectedRoute>
              } />
              
              <Route path="/leaderboard" element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              } />
              
              {/* Redirect unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

function App() {
  return (
    <CustomThemeProvider>
      <AppContent />
    </CustomThemeProvider>
  );
}

export default App;

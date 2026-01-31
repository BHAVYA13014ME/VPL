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
    const isColoredTheme = ['blue', 'purple', 'green'].includes(customTheme);
    
    return createTheme({
      palette: {
        mode: isDark || isColoredTheme ? 'dark' : 'light',
        primary: {
          main: customTheme === 'blue' ? '#4e54c8' 
               : customTheme === 'purple' ? '#667eea'
               : customTheme === 'green' ? '#11998e'
               : '#1976d2',
        },
        secondary: {
          main: customTheme === 'blue' ? '#8f94fb'
               : customTheme === 'purple' ? '#764ba2'
               : customTheme === 'green' ? '#38ef7d'
               : '#dc004e',
        },
        background: {
          default: isDark ? '#121212' 
                  : isColoredTheme ? 'transparent'
                  : '#f5f5f5',
          paper: isDark ? '#1e1e1e'
                : isColoredTheme ? 'rgba(255, 255, 255, 0.1)'
                : '#ffffff',
        },
        text: {
          primary: isDark || isColoredTheme ? '#ffffff' : '#212529',
          secondary: isDark || isColoredTheme ? '#b3b3b3' : '#6c757d',
        },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
          fontWeight: 600,
        },
        h5: {
          fontWeight: 600,
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: 8,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: isDark || isColoredTheme 
                ? '0 4px 16px rgba(0, 0, 0, 0.4)'
                : '0 2px 8px rgba(0,0,0,0.1)',
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

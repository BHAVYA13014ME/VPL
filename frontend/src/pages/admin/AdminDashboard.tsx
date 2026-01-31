import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Container,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  People,
  School,
  Settings,
  TrendingUp,
  Assignment,
  ArrowForward,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import AdminUsers from './AdminUsers';
import AdminCourses from './AdminCourses';
import AdminSettings from './AdminSettings';

const AdminDashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/dashboard/admin', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setDashboardData(response.data.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Use API data if available, otherwise fallback to default values
  const stats = dashboardData?.stats || {
    totalUsers: 0,
    totalCourses: 0,
    totalAssignments: 0,
    activeUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    recentUsers: 0
  };

  // Calculate system health based on active users
  const systemHealth = stats.totalUsers > 0 
    ? Math.round((stats.activeUsers / stats.totalUsers) * 100) 
    : 100;

  // Daily signups (users created today)
  const dailySignups = stats.dailySignups || 0;

  return (
    <Layout title="Admin Dashboard">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Welcome Section with Refresh Button */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Admin Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              System overview and management controls
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Last updated: {lastUpdated.toLocaleTimeString()} (Auto-refreshes every 30s)
            </Typography>
          </Box>
          <Tooltip title="Refresh data now">
            <span>
              <IconButton 
                onClick={fetchDashboardData} 
                disabled={loading}
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Stats Grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(4, 1fr)' 
          }, 
          gap: 3, 
          mb: 4 
        }}>
          <Card 
            sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}
            onClick={() => navigate('/admin/users')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <People sx={{ color: '#4facfe', fontSize: 40 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4">
                    {stats.totalUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
                <ArrowForward sx={{ color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>

          <Card 
            sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}
            onClick={() => navigate('/admin/courses')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <School sx={{ color: '#f093fb', fontSize: 40 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4">
                    {stats.totalCourses}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Courses
                  </Typography>
                </Box>
                <ArrowForward sx={{ color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>

          <Card 
            sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}
            onClick={() => navigate('/assignments')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Assignment sx={{ color: '#ffd700', fontSize: 40 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4">
                    {stats.totalAssignments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Assignments
                  </Typography>
                </Box>
                <ArrowForward sx={{ color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUp sx={{ color: '#00f2fe', fontSize: 40 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4">
                    {stats.activeUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                </Box>
                <ArrowForward sx={{ color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Additional Info */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
          gap: 3, 
          mb: 4 
        }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <Typography variant="h3" color={systemHealth > 80 ? 'success.main' : systemHealth > 50 ? 'warning.main' : 'error.main'}>
                {systemHealth}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {systemHealth > 80 ? 'All systems operational' : systemHealth > 50 ? 'Moderate activity' : 'Low activity'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Based on {stats.activeUsers} of {stats.totalUsers} users active in last 7 days
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Signups
              </Typography>
              <Typography variant="h3" color="primary">
                {dailySignups}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New registrations today
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Recent signups (30 days): {stats.recentUsers || 0}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Students</Typography>
                  <Typography variant="body1" fontWeight="bold">{stats.totalStudents}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Teachers</Typography>
                  <Typography variant="body1" fontWeight="bold">{stats.totalTeachers}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Quick Actions */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
              <Button variant="outlined" startIcon={<People />} onClick={() => navigate('/admin/users')}>
                Manage Users
              </Button>
              <Button variant="outlined" startIcon={<School />} onClick={() => navigate('/admin/courses')}>
                Manage Courses
              </Button>
              <Button variant="outlined" startIcon={<Settings />} onClick={() => navigate('/admin/settings')}>
                Settings
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

const AdminDashboard: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboardHome />} />
      <Route path="/users" element={<AdminUsers />} />
      <Route path="/courses" element={<AdminCourses />} />
      <Route path="/settings" element={<AdminSettings />} />
    </Routes>
  );
};

export default AdminDashboard;

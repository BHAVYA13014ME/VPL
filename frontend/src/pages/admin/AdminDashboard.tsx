import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  LinearProgress,
  Avatar,
  Chip,
} from '@mui/material';
import {
  People,
  School,
  Settings,
  TrendingUp,
  Assignment,
  ArrowForward,
  Refresh as RefreshIcon,
  AdminPanelSettings,
  PersonAdd,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';
import axios from 'axios';
import AdminUsers from './AdminUsers';
import AdminCourses from './AdminCourses';
import AdminSettings from './AdminSettings';

const CARD  = 'rgba(30,41,64,0.85)';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT  = '#e8dcc4';
const MUTED = 'rgba(232,220,196,0.6)';
const ACCENT = '#d97534';

const cardSx = {
  bgcolor: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 3,
  backdropFilter: 'blur(12px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  p: 3,
};

const AdminDashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      const response = await axios.get('/api/dashboard/admin', {
        headers: { Authorization: `Bearer ${token}` }
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

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = dashboardData?.stats || {
    totalUsers: 0,
    totalCourses: 0,
    totalAssignments: 0,
    activeUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    recentUsers: 0,
    dailySignups: 0,
  };

  const systemHealth = stats.totalUsers > 0
    ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
    : 100;

  const dailySignups = stats.dailySignups || 0;

  if (loading) {
    return (
      <Layout title="Admin Dashboard">
        <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress sx={{ color: ACCENT }} />
        </Container>
      </Layout>
    );
  }

  const statCards = [
    { icon: <People sx={{ color: '#4facfe', fontSize: 36 }} />, value: stats.totalUsers, label: 'Total Users', onClick: () => navigate('/admin/users') },
    { icon: <School sx={{ color: '#f093fb', fontSize: 36 }} />, value: stats.totalCourses, label: 'Total Courses', onClick: () => navigate('/admin/courses') },
    { icon: <Assignment sx={{ color: '#ffd700', fontSize: 36 }} />, value: stats.totalAssignments, label: 'Assignments', onClick: () => navigate('/assignments') },
    { icon: <TrendingUp sx={{ color: ACCENT, fontSize: 36 }} />, value: stats.activeUsers, label: 'Active Users', onClick: undefined },
  ];

  return (
    <Layout title="Admin Dashboard">
      <Box sx={{ minHeight: '100vh', bgcolor: '#111827', py: 4 }}>
        <Container maxWidth="xl">

          {/* Header */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ ...cardSx, flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: `${ACCENT}33`, color: ACCENT, border: `2px solid ${ACCENT}` }}>
                <AdminPanelSettings sx={{ fontSize: 32 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" sx={{ color: TEXT, fontWeight: 700, mb: 0.5 }}>
                  Admin Dashboard
                </Typography>
                <Typography sx={{ color: MUTED, mb: 0.5 }}>
                  System overview and management controls
                </Typography>
                <Typography variant="caption" sx={{ color: MUTED }}>
                  Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 30s
                </Typography>
              </Box>
              <Chip
                label="Administrator"
                sx={{ bgcolor: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}44`, fontWeight: 600 }}
              />
            </Box>
            <Tooltip title="Refresh data">
              <IconButton
                onClick={fetchDashboardData}
                disabled={loading}
                sx={{ bgcolor: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}44`, mt: 1, '&:hover': { bgcolor: `${ACCENT}33` } }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: ACCENT }} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Stat Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 3, mb: 4 }}>
            {statCards.map((card, i) => (
              <Box
                key={i}
                onClick={card.onClick}
                sx={{ ...cardSx, cursor: card.onClick ? 'pointer' : 'default', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': card.onClick ? { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' } : {} }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }}>{card.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" sx={{ color: TEXT, fontWeight: 700, lineHeight: 1.1 }}>{card.value}</Typography>
                    <Typography variant="body2" sx={{ color: MUTED }}>{card.label}</Typography>
                  </Box>
                  {card.onClick && <ArrowForward sx={{ color: MUTED, fontSize: 18 }} />}
                </Box>
              </Box>
            ))}
          </Box>

          {/* System Health + Daily Signups */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 3, mb: 4 }}>

            {/* System Health */}
            <Box sx={cardSx}>
              <Typography variant="h6" sx={{ color: TEXT, fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                {systemHealth > 80
                  ? <CheckCircle sx={{ color: '#51cf66', fontSize: 20 }} />
                  : <Warning sx={{ color: '#ffd700', fontSize: 20 }} />}
                System Health
              </Typography>
              <Typography
                variant="h2"
                sx={{ color: systemHealth > 80 ? '#51cf66' : systemHealth > 50 ? '#ffd700' : '#ff6b6b', fontWeight: 700, mb: 1 }}
              >
                {systemHealth}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={systemHealth}
                sx={{ height: 8, borderRadius: 4, mb: 1.5, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: systemHealth > 80 ? '#51cf66' : systemHealth > 50 ? '#ffd700' : '#ff6b6b', borderRadius: 4 } }}
              />
              <Typography variant="body2" sx={{ color: MUTED }}>
                {systemHealth > 80 ? 'All systems operational' : systemHealth > 50 ? 'Moderate activity' : 'Low activity'}
              </Typography>
              <Typography variant="caption" sx={{ color: MUTED, display: 'block', mt: 0.5 }}>
                {stats.activeUsers} of {stats.totalUsers} users active in last 7 days
              </Typography>
            </Box>

            {/* Daily Signups */}
            <Box sx={cardSx}>
              <Typography variant="h6" sx={{ color: TEXT, fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonAdd sx={{ color: '#4facfe', fontSize: 20 }} />
                Daily Signups
              </Typography>
              <Typography variant="h2" sx={{ color: ACCENT, fontWeight: 700, mb: 1 }}>
                {dailySignups}
              </Typography>
              <Typography variant="body2" sx={{ color: MUTED, mb: 2 }}>
                New registrations today
              </Typography>
              <Typography variant="caption" sx={{ color: MUTED, display: 'block', mb: 2 }}>
                Recent signups (30 days): {stats.recentUsers || 0}
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, pt: 1.5, borderTop: `1px solid ${BORDER}` }}>
                <Box>
                  <Typography variant="caption" sx={{ color: MUTED }}>Students</Typography>
                  <Typography variant="h6" sx={{ color: TEXT, fontWeight: 700 }}>{stats.totalStudents}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: MUTED }}>Teachers</Typography>
                  <Typography variant="h6" sx={{ color: TEXT, fontWeight: 700 }}>{stats.totalTeachers}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Quick Actions */}
          <Box sx={cardSx}>
            <Typography variant="h6" sx={{ color: TEXT, fontWeight: 600, mb: 2.5 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[
                { label: 'Manage Users', icon: <People />, path: '/admin/users', color: '#4facfe' },
                { label: 'Manage Courses', icon: <School />, path: '/admin/courses', color: '#f093fb' },
                { label: 'Settings', icon: <Settings />, path: '/admin/settings', color: ACCENT },
              ].map((action, i) => (
                <Button
                  key={i}
                  variant="outlined"
                  startIcon={action.icon}
                  onClick={() => navigate(action.path)}
                  sx={{ borderColor: `${action.color}55`, color: action.color, textTransform: 'none', fontWeight: 600, px: 2.5, py: 1, borderRadius: 2, '&:hover': { bgcolor: `${action.color}15`, borderColor: action.color } }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </Box>

        </Container>
      </Box>
    </Layout>
  );
};

const AdminDashboard: React.FC = () => (
  <Routes>
    <Route path="/" element={<AdminDashboardHome />} />
    <Route path="/users" element={<AdminUsers />} />
    <Route path="/courses" element={<AdminCourses />} />
    <Route path="/settings" element={<AdminSettings />} />
  </Routes>
);

export default AdminDashboard;

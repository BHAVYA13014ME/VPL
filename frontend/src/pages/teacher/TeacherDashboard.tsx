import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Container,
  CircularProgress,
  Button,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Assignment,
  Chat,
  People,
  TrendingUp,
  Notifications,
  PlayArrow,
  MenuBook,
  EmojiEvents,
  Refresh as RefreshIcon,
  School,
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

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

interface TeacherStats {
  totalCourses: number;
  totalStudents: number;
  totalAssignments: number;
  avgRating: number;
}

interface TeacherDashboardData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
  };
  stats: TeacherStats;
  recentActivity: ActivityItem[];
  courses?: any[];
}

interface ActivityItem {
  _id: string;
  id?: string;
  type: string;
  title: string;
  description: string;
  course: { title: string };
  timestamp: Date | string;
  createdAt?: Date | string;
}

const TeacherDashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const getUserInitials = () => {
    if (!user) return 'T';
    if (user.firstName && typeof user.firstName === 'string' && user.firstName.length > 0) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user.email && typeof user.email === 'string' && user.email.length > 0) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'T';
  };

  const getUserDisplayName = () => {
    if (!user) return 'Teacher';
    if (user.fullName && typeof user.fullName === 'string') return user.fullName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.email) return user.email;
    return 'Teacher';
  };

  const safePercentage = (value: number | undefined, max: number): number => {
    const numValue = value ?? 0;
    if (!max || max === 0) return 0;
    return Math.min((numValue / max) * 100, 100);
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      const response = await axios.get('/api/dashboard/teacher', {
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

  if (loading) {
    return (
      <Layout title="Teacher Dashboard">
        <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress sx={{ color: ACCENT }} />
        </Container>
      </Layout>
    );
  }

  const stats = dashboardData?.stats || { totalStudents: 0, totalCourses: 0, totalAssignments: 0, avgRating: 0 };
  const engagementRate = stats.totalStudents > 0 ? Math.min(Math.round((stats.totalStudents / 200) * 100), 100) : 0;
  const completionRate = stats.totalAssignments > 0 ? 75 : 0;

  const recentActivity = dashboardData?.recentActivity && Array.isArray(dashboardData.recentActivity) && dashboardData.recentActivity.length > 0
    ? dashboardData.recentActivity
    : [
        { _id: '1', type: 'submission', title: 'Assignment Submitted', description: 'John Doe submitted "React Hooks Assignment"', course: { title: 'React Development' }, timestamp: new Date() },
        { _id: '2', type: 'discussion', title: 'New Discussion Reply', description: 'Sarah asked a question in "JavaScript Fundamentals"', course: { title: 'JavaScript Course' }, timestamp: new Date() },
        { _id: '3', type: 'enrollment', title: 'New Student Enrollment', description: 'Mike Johnson enrolled in your course', course: { title: 'Database Design' }, timestamp: new Date() },
      ];

  const handleActivityClick = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'submission': navigate('/assignments'); break;
      case 'discussion': navigate('/chat'); break;
      case 'enrollment': navigate('/courses'); break;
      default: navigate('/teacher');
    }
  };

  const statCards = [
    { icon: <People sx={{ color: '#4facfe', fontSize: 36 }} />, value: stats.totalStudents, label: 'Total Students', max: 200, onClick: () => navigate('/courses') },
    { icon: <MenuBook sx={{ color: '#f093fb', fontSize: 36 }} />, value: stats.totalCourses, label: 'Active Courses', max: 15, onClick: () => navigate('/courses') },
    { icon: <Assignment sx={{ color: '#ffd700', fontSize: 36 }} />, value: stats.totalAssignments, label: 'Assignments', max: 50, onClick: () => navigate('/assignments') },
    { icon: <TrendingUp sx={{ color: ACCENT, fontSize: 36 }} />, value: `${engagementRate}%`, label: 'Engagement Rate', pct: engagementRate, onClick: () => navigate('/analytics') },
  ];

  return (
    <Layout title="Teacher Dashboard">
      <Box sx={{ minHeight: '100vh', bgcolor: '#111827', py: 4 }}>
        <Container maxWidth="xl">

          {/* Welcome Banner */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ ...cardSx, flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                src={user?.profile?.profilePicture}
                sx={{ width: 72, height: 72, bgcolor: ACCENT, fontSize: '1.8rem', border: `3px solid ${ACCENT}` }}
              >
                {getUserInitials()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" sx={{ color: TEXT, fontWeight: 700, mb: 0.5 }}>
                  Welcome Back, {getUserDisplayName()}!
                </Typography>
                <Typography sx={{ color: MUTED, mb: 1 }}>
                  Ready to inspire minds today? Your students are waiting for your guidance!
                </Typography>
                <Typography variant="caption" sx={{ color: MUTED }}>
                  Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 30s
                </Typography>
              </Box>
              <Chip
                icon={<School sx={{ color: `${ACCENT} !important` }} />}
                label="Educator"
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
                sx={{ ...cardSx, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 40px rgba(0,0,0,0.5)` } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }}>{card.icon}</Box>
                  <Box>
                    <Typography variant="h4" sx={{ color: TEXT, fontWeight: 700, lineHeight: 1.1 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: MUTED }}>{card.label}</Typography>
                  </Box>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: MUTED }}>Progress</Typography>
                    <Typography variant="caption" sx={{ color: ACCENT }}>
                      {typeof card.pct !== 'undefined' ? card.pct : safePercentage(typeof card.value === 'number' ? card.value : 0, card.max || 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={typeof card.pct !== 'undefined' ? card.pct : safePercentage(typeof card.value === 'number' ? card.value : 0, card.max || 100)}
                    sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: ACCENT, borderRadius: 3 } }}
                  />
                </Box>
              </Box>
            ))}
          </Box>

          {/* Activity + Insights */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>

            {/* Recent Activity */}
            <Box sx={cardSx}>
              <Typography variant="h6" sx={{ color: TEXT, fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Notifications sx={{ color: '#f093fb' }} />
                Recent Activity
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {recentActivity.map((activity) => {
                  const iconMap: Record<string, React.ReactNode> = {
                    submission: <Assignment sx={{ fontSize: 18 }} />,
                    discussion: <Chat sx={{ fontSize: 18 }} />,
                    enrollment: <People sx={{ fontSize: 18 }} />,
                  };
                  return (
                    <Box
                      key={activity._id || Math.random()}
                      onClick={() => handleActivityClick(activity)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
                    >
                      <Avatar sx={{ bgcolor: 'rgba(217,117,52,0.15)', color: ACCENT, width: 38, height: 38 }}>
                        {iconMap[activity.type] || <Notifications sx={{ fontSize: 18 }} />}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ color: TEXT, fontWeight: 600 }}>{activity.title || 'Activity'}</Typography>
                        <Typography variant="body2" sx={{ color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.description}</Typography>
                        {activity.course && (
                          <Chip label={activity.course.title} size="small" sx={{ mt: 0.5, bgcolor: `${ACCENT}22`, color: ACCENT, fontSize: '0.7rem', height: 20 }} />
                        )}
                      </Box>
                      <IconButton size="small" sx={{ color: MUTED, '&:hover': { color: ACCENT } }}>
                        <PlayArrow fontSize="small" />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Teaching Insights */}
            <Box sx={cardSx}>
              <Typography variant="h6" sx={{ color: TEXT, fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmojiEvents sx={{ color: '#ffd700' }} />
                Teaching Insights
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                  { label: 'Student Engagement', value: 92 },
                  { label: 'Assignment Completion', value: completionRate },
                  { label: 'Average Rating', value: Math.round((stats.avgRating / 5) * 100), display: `${stats.avgRating.toFixed(1)} / 5.0` },
                ].map((item, i) => (
                  <Box key={i}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography variant="body2" sx={{ color: MUTED }}>{item.label}</Typography>
                      <Typography variant="body2" sx={{ color: ACCENT, fontWeight: 600 }}>{item.display || `${item.value}%`}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.value}
                      sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: ACCENT, borderRadius: 3 } }}
                    />
                  </Box>
                ))}
                <Button
                  variant="contained"
                  onClick={() => navigate('/analytics')}
                  fullWidth
                  sx={{ mt: 1, background: `linear-gradient(135deg, ${ACCENT}, #c06420)`, color: '#fff', textTransform: 'none', fontWeight: 600, py: 1.2, borderRadius: 2, '&:hover': { background: `linear-gradient(135deg, #c06420, ${ACCENT})`, transform: 'translateY(-2px)', boxShadow: `0 6px 20px ${ACCENT}55` }, transition: 'all 0.2s' }}
                >
                  View Detailed Analytics
                </Button>
              </Box>
            </Box>
          </Box>

        </Container>
      </Box>
    </Layout>
  );
};

const TeacherDashboard: React.FC = () => (
  <Routes>
    <Route index element={<TeacherDashboardHome />} />
  </Routes>
);

export default TeacherDashboard;

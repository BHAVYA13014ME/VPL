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
} from '@mui/material';
import {
  School,
  Assignment,
  Chat,
  People,
  TrendingUp,
  Notifications,
  PlayArrow,
  MenuBook,
  EmojiEvents,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';
import '../../styles/PremiumDashboard.css';
import '../../styles/themes.css';

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
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Safe function to get user initials
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

  // Safe function to get user display name
  const getUserDisplayName = () => {
    if (!user) return 'Teacher';
    if (user.fullName && typeof user.fullName === 'string') {
      return user.fullName;
    }
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.email) {
      return user.email;
    }
    return 'Teacher';
  };

  // Safe percentage calculation helper
  const safePercentage = (value: number | undefined, max: number): number => {
    const numValue = value ?? 0;
    if (!max || max === 0) return 0;
    return Math.min((numValue / max) * 100, 100);
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

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

  // Initial fetch and auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="premium-dashboard themed-container">
        <Layout title="Teacher Dashboard">
          <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress sx={{ color: '#4facfe' }} />
          </Container>
        </Layout>
      </div>
    );
  }

  const stats = dashboardData?.stats || { 
    totalStudents: 0, 
    totalCourses: 0, 
    totalAssignments: 0, 
    avgRating: 0
  };

  // Calculate engagement rate based on real data
  const engagementRate = stats.totalStudents > 0 ? Math.min(Math.round((stats.totalStudents / 200) * 100), 100) : 0;

  const recentActivity = dashboardData?.recentActivity && Array.isArray(dashboardData.recentActivity) && dashboardData.recentActivity.length > 0 
    ? dashboardData.recentActivity 
    : [
        {
          _id: '1',
          type: 'submission',
          title: 'Assignment Submitted',
          description: 'John Doe submitted "React Hooks Assignment"',
          course: { title: 'React Development' },
          timestamp: new Date(),
        },
        {
          _id: '2',
          type: 'discussion',
          title: 'New Discussion Reply',
          description: 'Sarah asked a question in "JavaScript Fundamentals"',
          course: { title: 'JavaScript Course' },
          timestamp: new Date(),
        },
        {
          _id: '3',
          type: 'enrollment',
          title: 'New Student Enrollment',
          description: 'Mike Johnson enrolled in your course',
          course: { title: 'Database Design' },
          timestamp: new Date(),
        },
      ];

  // Calculate completion rate based on total assignments (placeholder)
  const completionRate = stats.totalAssignments > 0 ? 75 : 0; // Placeholder until backend provides completion data

  // Handle activity item click - navigate to relevant section
  const handleActivityClick = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'submission':
        navigate('/assignments');
        break;
      case 'discussion':
        navigate('/chat');
        break;
      case 'enrollment':
        navigate('/courses');
        break;
      default:
        navigate('/teacher');
    }
  };

  // Navigate to detailed analytics
  const handleViewAnalytics = () => {
    navigate('/analytics');
  };

  return (
    <div className="premium-dashboard themed-container">
      <Layout title="Teacher Dashboard">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Welcome Section with Refresh Button */}
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
            <div className="welcome-section themed-card" style={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div className="welcome-avatar">
                  <Avatar
                    src={user?.profile?.profilePicture}
                    sx={{ width: 80, height: 80 }}
                  >
                    {getUserInitials()}
                  </Avatar>
                </div>
                <Box sx={{ flex: 1 }}>
                  <Typography className="premium-title-light text-enhanced themed-text-primary">
                    Welcome Back, {getUserDisplayName()}!
                  </Typography>
                  <Typography className="premium-subtitle-light themed-text-secondary">
                    Ready to inspire minds today? Your students are waiting for your guidance! 🎓
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Last updated: {lastUpdated.toLocaleTimeString()} (Auto-refreshes every 30s)
                  </Typography>
                </Box>
              </Box>
            </div>
            <Tooltip title="Refresh data now">
              <span>
                <IconButton 
                  onClick={fetchDashboardData} 
                  disabled={loading}
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    mt: 2
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {/* Stats Cards */}
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
            <div 
              className="stats-card card-content-enhanced themed-card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/courses')}
              title="Click to view courses"
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <People className="animated-icon" sx={{ color: '#4facfe', fontSize: 40 }} />
                <Box>
                  <Typography className="stats-number" variant="h4">
                    {stats.totalStudents}
                  </Typography>
                  <Typography className="stats-label" variant="body2">
                    Total Students
                  </Typography>
                </Box>
              </Box>
              <div className="progress-container">
                <div className="progress-label">
                  <span>Progress</span>
                  <span className="progress-percentage">
                    {safePercentage(stats.totalStudents, 200).toFixed(0)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${safePercentage(stats.totalStudents, 200)}%` }}
                    role="progressbar"
                    aria-valuenow={safePercentage(stats.totalStudents, 200)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Student enrollment progress"
                  ></div>
                </div>
              </div>
            </div>

            <div 
              className="stats-card card-content-enhanced"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/courses')}
              title="Click to view courses"
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <MenuBook className="animated-icon" sx={{ color: '#f093fb', fontSize: 40 }} />
                <Box>
                  <Typography className="stats-number" variant="h4">
                    {stats.totalCourses}
                  </Typography>
                  <Typography className="stats-label" variant="body2">
                    Active Courses
                  </Typography>
                </Box>
              </Box>
              <div className="progress-container">
                <div className="progress-label">
                  <span>Progress</span>
                  <span className="progress-percentage">
                    {safePercentage(stats.totalCourses, 15).toFixed(0)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${safePercentage(stats.totalCourses, 15)}%` }}
                    role="progressbar"
                    aria-valuenow={safePercentage(stats.totalCourses, 15)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Course creation progress"
                  ></div>
                </div>
              </div>
            </div>

            <div 
              className="stats-card card-content-enhanced"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/assignments')}
              title="Click to view assignments"
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Assignment className="animated-icon" sx={{ color: '#ffd700', fontSize: 40 }} />
                <Box>
                  <Typography className="stats-number" variant="h4">
                    {stats.totalAssignments}
                  </Typography>
                  <Typography className="stats-label" variant="body2">
                    Assignments
                  </Typography>
                </Box>
              </Box>
              <div className="progress-container">
                <div className="progress-label">
                  <span>Progress</span>
                  <span className="progress-percentage">
                    {safePercentage(stats.totalAssignments, 50).toFixed(0)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${safePercentage(stats.totalAssignments, 50)}%` }}
                    role="progressbar"
                    aria-valuenow={safePercentage(stats.totalAssignments, 50)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Assignment creation progress"
                  ></div>
                </div>
              </div>
            </div>

            <div 
              className="stats-card card-content-enhanced"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/analytics')}
              title="Click to view analytics"
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TrendingUp className="animated-icon" sx={{ color: '#00f2fe', fontSize: 40 }} />
                <Box>
                  <Typography className="stats-number" variant="h4">
                    {engagementRate}%
                  </Typography>
                  <Typography className="stats-label" variant="body2">
                    Engagement Rate
                  </Typography>
                </Box>
              </Box>
              <div className="progress-container">
                <div className="progress-label">
                  <span>Progress</span>
                  <span className="progress-percentage">{engagementRate}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${engagementRate}%` }}
                    role="progressbar"
                    aria-valuenow={engagementRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Student engagement progress"
                  ></div>
                </div>
              </div>
            </div>
          </Box>

          {/* Recent Activity & Teaching Insights */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              md: '2fr 1fr' 
            }, 
            gap: 3 
          }}>
            <div className="glass-card dashboard-section" style={{ padding: '24px' }}>
              <Typography className="premium-heading" variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Notifications className="animated-icon" sx={{ color: '#f093fb' }} />
                Recent Activity
              </Typography>
              <div className="activity-list">
                {Array.isArray(recentActivity) && recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div 
                      key={activity._id || Math.random()} 
                      className="activity-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleActivityClick(activity)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(79, 172, 254, 0.2)', color: '#4facfe' }}>
                          {activity.type === 'submission' ? <Assignment /> : 
                           activity.type === 'discussion' ? <Chat /> : <People />}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography className="activity-title" variant="subtitle1">
                            {activity.title || 'Unknown Activity'}
                          </Typography>
                          <Typography className="activity-description" variant="body2">
                            {activity.description || 'No description available'}
                          </Typography>
                          {activity.course && (
                            <Chip 
                              label={activity.course.title || 'Unknown Course'} 
                              size="small" 
                              className="premium-chip"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                        <IconButton 
                          className="animated-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivityClick(activity);
                          }}
                          title="View details"
                        >
                          <PlayArrow sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                        </IconButton>
                      </Box>
                    </div>
                  ))
                ) : (
                  <Typography variant="body2" sx={{ textAlign: 'center', py: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
                    No recent activity to display
                  </Typography>
                )}
              </div>
            </div>

            <div className="glass-card dashboard-section" style={{ padding: '24px' }}>
              <Typography className="premium-text" variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmojiEvents className="animated-icon" sx={{ color: '#ffd700' }} />
                Teaching Insights
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography className="premium-muted" variant="body2">
                      Student Engagement
                    </Typography>
                    <Typography className="premium-text" variant="body2">
                      92%
                    </Typography>
                  </Box>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography className="premium-muted" variant="body2">
                      Assignment Completion Rate
                    </Typography>
                    <Typography className="premium-text" variant="body2">
                      {completionRate}%
                    </Typography>
                  </Box>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography className="premium-muted" variant="body2">
                      Average Rating
                    </Typography>
                    <Typography className="premium-text" variant="body2">
                      {stats.avgRating.toFixed(1)} / 5.0
                    </Typography>
                  </Box>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(stats.avgRating / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </Box>

                <Button 
                  variant="contained"
                  className="premium-button" 
                  onClick={handleViewAnalytics}
                  fullWidth
                  sx={{ 
                    marginTop: '16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 'bold',
                    py: 1.5,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  View Detailed Analytics
                </Button>
              </Box>
            </div>
          </Box>
        </Container>
      </Layout>
    </div>
  );
};

const TeacherDashboard: React.FC = () => {
  return (
    <Routes>
      <Route index element={<TeacherDashboardHome />} />
    </Routes>
  );
};

export default TeacherDashboard;
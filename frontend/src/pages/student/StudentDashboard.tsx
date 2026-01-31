import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Container,
  Tooltip,
  CircularProgress as MuiCircularProgress,
} from '@mui/material';
import {
  School,
  Assignment,
  TrendingUp,
  PlayArrow,
  EmojiEvents,
  Notifications,
  Campaign,
  Warning,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import '../../styles/PremiumDashboard.css';
import '../../styles/themes.css';

interface DashboardStats {
  enrolledCourses: number;
  completedAssignments: number;
  pendingAssignments: number;
  totalPoints: number;
  rank: number;
  streak: number | { current: number; longest: number; lastActivity: string };
}

interface RecentActivity {
  _id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  course?: {
    title: string;
  };
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  courseTitle: string;
  courseId: string;
  isImportant: boolean;
  createdAt: string;
  attachments?: {
    filename: string;
    originalName: string;
    path: string;
    size: number;
    mimeType: string;
  }[];
}

const StudentDashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };
  
  // Safe function to get user initials
  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.firstName && typeof user.firstName === 'string' && user.firstName.length > 0) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user.email && typeof user.email === 'string' && user.email.length > 0) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Safe function to get user display name
  const getUserDisplayName = () => {
    if (!user) return 'Student';
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
    return 'Student';
  };

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/dashboard/student', {
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
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Use API data if available, otherwise fallback to default values
  const stats: DashboardStats = {
    enrolledCourses: dashboardData?.stats?.totalCourses || 0,
    completedAssignments: dashboardData?.stats?.completedAssignments || 0,
    pendingAssignments: dashboardData?.stats?.pendingAssignments || 0,
    totalPoints: dashboardData?.stats?.totalPoints || 0,
    rank: dashboardData?.stats?.rank || 0,
    streak: dashboardData?.stats?.streak || 0,
  };
  
  // Get streak value (handle both number and object formats)
  const streakDays = typeof stats.streak === 'object' ? stats.streak.current : stats.streak;
  
  const announcements: Announcement[] = dashboardData?.announcements || [];
  
  const recentActivity: RecentActivity[] = dashboardData?.recentActivity || [];

  return (
    <div className="premium-dashboard themed-container">
      <Layout title="Student Dashboard">
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
                    Welcome back, {getUserDisplayName()}!
                  </Typography>
                  <Typography className="premium-subtitle-light themed-text-secondary">
                    Ready to continue your learning journey? Let's achieve greatness together! 🚀
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
                  {loading ? <MuiCircularProgress size={24} color="inherit" /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {/* Stats Section */}
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
            <div className="stats-card card-content-enhanced themed-card">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <School className="animated-icon" sx={{ color: '#4facfe', fontSize: 40 }} />
                <Box>
                  <Typography className="stats-number" variant="h4">
                    {stats.enrolledCourses}
                  </Typography>
                  <Typography className="stats-label" variant="body2">
                    Enrolled Courses
                  </Typography>
                </Box>
              </Box>
              <div className="progress-container">
                <div className="progress-label">
                  <span>Progress</span>
                  <span className="progress-percentage">
                    {Math.min((stats.enrolledCourses / 10) * 100, 100).toFixed(0)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min((stats.enrolledCourses / 10) * 100, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={Math.min((stats.enrolledCourses / 10) * 100, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Course enrollment progress"
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
                <Assignment className="animated-icon" sx={{ color: '#f093fb', fontSize: 40 }} />
                <Box>
                  <Typography className="stats-number" variant="h4">
                    {stats.completedAssignments}
                  </Typography>
                  <Typography className="stats-label" variant="body2">
                    Completed
                  </Typography>
                </Box>
              </Box>
              <div className="progress-container">
                <div className="progress-label">
                  <span>Progress</span>
                  <span className="progress-percentage">
                    {Math.min((stats.completedAssignments / 20) * 100, 100).toFixed(0)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min((stats.completedAssignments / 20) * 100, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={Math.min((stats.completedAssignments / 20) * 100, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Assignment completion progress"
                  ></div>
                </div>
              </div>
            </div>

            <div className="stats-card card-content-enhanced">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <EmojiEvents className="animated-icon" sx={{ color: '#ffd700', fontSize: 40 }} />
                <Box>
                  <Typography className="stats-number" variant="h4">
                    {stats.totalPoints}
                  </Typography>
                  <Typography className="stats-label" variant="body2">
                    Total Points
                  </Typography>
                </Box>
              </Box>
              <div className="progress-container">
                <div className="progress-label">
                  <span>Progress</span>
                  <span className="progress-percentage">
                    {Math.min((stats.totalPoints / 1000) * 100, 100).toFixed(0)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min((stats.totalPoints / 1000) * 100, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={Math.min((stats.totalPoints / 1000) * 100, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Points progress"
                  ></div>
                </div>
              </div>
            </div>

            <div className="stats-card card-content-enhanced">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TrendingUp className="animated-icon" sx={{ color: '#00f2fe', fontSize: 40 }} />
                <Box>
                  <Typography className="stats-number" variant="h4">
                    #{stats.rank}
                  </Typography>
                  <Typography className="stats-label" variant="body2">
                    Class Rank
                  </Typography>
                </Box>
              </Box>
              <div className="progress-container">
                <div className="progress-label">
                  <span>Progress</span>
                  <span className="progress-percentage">
                    {Math.max(100 - (stats.rank * 10), 20)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.max(100 - (stats.rank * 10), 20)}%` }}
                    role="progressbar"
                    aria-valuenow={Math.max(100 - (stats.rank * 10), 20)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Class rank progress"
                  ></div>
                </div>
              </div>
            </div>
          </Box>

          {/* Announcements Section */}
          <div className="glass-card dashboard-section" style={{ padding: '24px', marginBottom: '24px' }}>
            <Typography className="premium-heading" variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Campaign className="animated-icon" sx={{ color: '#ff6b6b' }} />
              Course Announcements
            </Typography>
            {announcements.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {announcements.map((announcement) => (
                  <Card 
                    key={announcement._id} 
                    sx={{ 
                      background: announcement.isImportant 
                        ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: announcement.isImportant 
                        ? '1px solid rgba(255, 107, 107, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      cursor: announcement.attachments && announcement.attachments.length > 0 ? 'pointer' : 'default',
                      transition: 'all 0.3s ease',
                      '&:hover': announcement.attachments && announcement.attachments.length > 0 ? {
                        transform: 'translateX(8px)',
                        boxShadow: '0 8px 24px rgba(79, 172, 254, 0.3)'
                      } : {}
                    }}
                    onClick={() => {
                      if (announcement.attachments && announcement.attachments.length > 0) {
                        // Open first PDF attachment
                        const pdfAttachment = announcement.attachments.find(att => 
                          att.mimeType === 'application/pdf' || att.filename.endsWith('.pdf')
                        );
                        if (pdfAttachment) {
                          window.open(`${API_BASE_URL}${pdfAttachment.path}`, '_blank');
                        }
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        {announcement.isImportant && (
                          <Warning sx={{ color: '#ff6b6b', fontSize: 28 }} />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6" className="premium-text" sx={{ fontWeight: 600 }}>
                              {announcement.title}
                            </Typography>
                            {announcement.isImportant && (
                              <Chip 
                                label="Important" 
                                size="small" 
                                sx={{ 
                                  bgcolor: 'rgba(255, 107, 107, 0.2)',
                                  color: '#ff6b6b',
                                  fontWeight: 600
                                }} 
                              />
                            )}
                          </Box>
                          <Typography variant="body2" className="premium-muted" sx={{ mb: 1.5 }}>
                            {announcement.content}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Chip 
                              label={announcement.courseTitle} 
                              size="small" 
                              className="premium-chip"
                              icon={<School sx={{ fontSize: 16 }} />}
                            />
                            <Typography variant="caption" className="premium-muted">
                              {formatDate(announcement.createdAt)}
                            </Typography>
                            {announcement.attachments && announcement.attachments.length > 0 && (
                              <Chip 
                                label={`📎 ${announcement.attachments.length} file${announcement.attachments.length > 1 ? 's' : ''}`}
                                size="small" 
                                sx={{ 
                                  bgcolor: 'rgba(79, 172, 254, 0.2)',
                                  color: '#4facfe',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }} 
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Box sx={{ 
                textAlign: 'center', 
                py: 4,
                opacity: 0.7 
              }}>
                <Campaign sx={{ fontSize: 60, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
                <Typography variant="body1" className="premium-muted">
                  No announcements yet
                </Typography>
                <Typography variant="body2" className="premium-muted" sx={{ mt: 1 }}>
                  Check back later for updates from your instructors
                </Typography>
              </Box>
            )}
          </div>

          {/* Recent Activity & Quick Actions */}
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
                {recentActivity.map((activity, index) => (
                  <div key={activity._id || `activity-${index}`} className="activity-item">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'rgba(79, 172, 254, 0.2)', color: '#4facfe' }}>
                        {activity.type === 'assignment' ? <Assignment /> : <School />}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography className="activity-title" variant="subtitle1">
                          {activity.title}
                        </Typography>
                        <Typography className="activity-description" variant="body2">
                          {activity.description}
                        </Typography>
                        {activity.course && (
                          <Chip 
                            label={activity.course.title} 
                            size="small" 
                            className="premium-chip"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                      <IconButton className="animated-icon">
                        <PlayArrow sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                      </IconButton>
                    </Box>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card dashboard-section" style={{ padding: '24px' }}>
              <Typography className="premium-text" variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmojiEvents className="animated-icon" sx={{ color: '#ffd700' }} />
                Quick Stats
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography className="premium-muted" variant="body2">
                      Course Progress
                    </Typography>
                    <Typography className="premium-text" variant="body2">
                      75%
                    </Typography>
                  </Box>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography className="premium-muted" variant="body2">
                      Assignment Completion
                    </Typography>
                    <Typography className="premium-text" variant="body2">
                      {Math.round((stats.completedAssignments / (stats.completedAssignments + stats.pendingAssignments)) * 100)}%
                    </Typography>
                  </Box>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.round((stats.completedAssignments / (stats.completedAssignments + stats.pendingAssignments)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography className="premium-muted" variant="body2">
                      Learning Streak
                    </Typography>
                    <Typography className="premium-text" variant="body2">
                      {streakDays} days
                    </Typography>
                  </Box>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.min((streakDays / 30) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </Box>

                <button className="premium-button" style={{ marginTop: '16px' }}>
                  View Detailed Analytics
                </button>
              </Box>
            </div>
          </Box>
        </Container>
      </Layout>
    </div>
  );
};

const StudentDashboard: React.FC = () => {
  return (
    <Routes>
      <Route path="/*" element={<StudentDashboardHome />} />
    </Routes>
  );
};

export default StudentDashboard;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Container,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import Stack from '@mui/material/Stack';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Star as StarIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  EmojiEvents as TrophyIcon,
  LocalLibrary as LibraryIcon,
  CheckCircle as CheckCircleIcon,
  Chat as ChatIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

interface TeacherStats {
  totalCourses: number;
  totalStudents: number;
  avgRating: number;
  totalAssignments?: number;
  activeStudents?: number;
  completionRate?: number;
}

interface CourseAnalytics {
  _id: string;
  title: string;
  enrollmentCount: number;
  rating?: { average: number };
  analytics?: { views: number; completionRate: number };
}

interface EngagementData {
  timeframe: string;
  dailyActiveUsers: Array<{ _id: string; count: number }>;
  distributions: {
    streaks: Record<string, number>;
    points: Record<string, number>;
  };
  topCourses: CourseAnalytics[];
}

const Analytics: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [timeframe, setTimeframe] = useState('30d');
  
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementData | null>(null);
  const [courses, setCourses] = useState<CourseAnalytics[]>([]);

  const menuItems = user?.role === 'teacher' ? [
    { text: 'Dashboard', icon: <SchoolIcon />, path: '/dashboard' },
    { text: 'My Courses', icon: <SchoolIcon />, path: '/courses' },
    { text: 'Assignments', icon: <AssignmentIcon />, path: '/assignments' },
    { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
  ] : [];

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [statsRes, engagementRes, coursesRes] = await Promise.all([
        axios.get('/api/analytics/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/analytics/engagement?timeframe=${timeframe}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/courses/my/courses', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setTeacherStats(statsRes.data.data);
      setEngagementData(engagementRes.data.data);
      setCourses(coursesRes.data.data?.courses || []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Analytics">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Analytics">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Layout>
    );
  }

  // Prepare chart data
  const dailyActiveUsersData = {
    labels: engagementData?.dailyActiveUsers.map(d => new Date(d._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) || [],
    datasets: [{
      label: 'Active Users',
      data: engagementData?.dailyActiveUsers.map(d => d.count) || [],
      borderColor: theme.palette.primary.main,
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
      fill: true,
      tension: 0.4,
    }]
  };

  const streakDistributionData = {
    labels: Object.keys(engagementData?.distributions.streaks || {}),
    datasets: [{
      label: 'Students',
      data: Object.values(engagementData?.distributions.streaks || {}),
      backgroundColor: [
        alpha(theme.palette.error.main, 0.8),
        alpha(theme.palette.warning.main, 0.8),
        alpha(theme.palette.info.main, 0.8),
        alpha(theme.palette.success.main, 0.8),
        alpha(theme.palette.primary.main, 0.8),
      ],
    }]
  };

  const topCoursesData = {
    labels: engagementData?.topCourses.slice(0, 5).map(c => c.title.length > 20 ? c.title.substring(0, 20) + '...' : c.title) || [],
    datasets: [{
      label: 'Enrollments',
      data: engagementData?.topCourses.slice(0, 5).map(c => c.enrollmentCount) || [],
      backgroundColor: alpha(theme.palette.secondary.main, 0.8),
    }]
  };

  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <Card sx={{ 
      height: '100%',
      background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
      border: `1px solid ${alpha(color, 0.2)}`,
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: alpha(color, 0.2), color }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Layout title="Analytics Dashboard">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
            📊 Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your teaching performance and student engagement
          </Typography>
        </Box>

        {/* Key Metrics */}
        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', mb: 4 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <StatCard
              title="Total Students"
              value={teacherStats?.totalStudents || 0}
              icon={<PeopleIcon />}
              color={theme.palette.primary.main}
              subtitle="Across all courses"
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <StatCard
              title="Active Courses"
              value={teacherStats?.totalCourses || 0}
              icon={<SchoolIcon />}
              color={theme.palette.secondary.main}
              subtitle="Your courses"
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <StatCard
              title="Average Rating"
              value={teacherStats?.avgRating?.toFixed(1) || '0.0'}
              icon={<StarIcon />}
              color={theme.palette.warning.main}
              subtitle="Student feedback"
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <StatCard
              title="Assignments"
              value={teacherStats?.totalAssignments || 0}
              icon={<AssignmentIcon />}
              color={theme.palette.success.main}
              subtitle="Total created"
            />
          </Box>
        </Stack>

        {/* Additional Stats Row */}
        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', mb: 4 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
            <StatCard
              title="Active Students"
              value={teacherStats?.activeStudents || 0}
              icon={<TrendingUpIcon />}
              color={theme.palette.info.main}
              subtitle="Active in last 30 days"
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
            <StatCard
              title="Completion Rate"
              value={`${teacherStats?.completionRate || 0}%`}
              icon={<CheckCircleIcon />}
              color={theme.palette.success.main}
              subtitle="Assignment submissions"
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
            <StatCard
              title="Total Enrollments"
              value={teacherStats?.totalStudents || 0}
              icon={<LibraryIcon />}
              color={theme.palette.primary.main}
              subtitle="Course enrollments"
            />
          </Box>
        </Stack>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Overview" />
            <Tab label="Engagement" />
            <Tab label="Course Performance" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
            {/* Daily Active Users Chart */}
            <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(66.666% - 16px)' } }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      📈 Student Activity Trends
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Timeframe</InputLabel>
                      <Select value={timeframe} label="Timeframe" onChange={(e) => setTimeframe(e.target.value)}>
                        <MenuItem value="7d">Last 7 days</MenuItem>
                        <MenuItem value="30d">Last 30 days</MenuItem>
                        <MenuItem value="90d">Last 90 days</MenuItem>
                        <MenuItem value="1y">Last year</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ height: 300 }}>
                    <Line
                      data={dailyActiveUsersData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                        scales: {
                          y: { beginAtZero: true },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Streak Distribution */}
            <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(33.333% - 16px)' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                    🔥 Learning Streaks
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Doughnut
                      data={streakDistributionData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        )}

        {activeTab === 1 && (
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
            {/* Top Performing Courses */}
            <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 12px)' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                    🏆 Top Performing Courses
                  </Typography>
                  <Box sx={{ height: 350 }}>
                    <Bar
                      data={topCoursesData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Student Engagement Metrics */}
            <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 12px)' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                    💡 Engagement Insights
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: theme.palette.primary.main }}>
                          <TrendingUpIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Active Students"
                        secondary={`${teacherStats?.activeStudents || 0} students active in last 30 days`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.2), color: theme.palette.success.main }}>
                          <CheckCircleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Assignment Completion"
                        secondary={`${teacherStats?.completionRate || 0}% of assignments submitted`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.2), color: theme.palette.warning.main }}>
                          <StarIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Average Rating"
                        secondary={`${teacherStats?.avgRating?.toFixed(1) || '0.0'} stars from student feedback`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.2), color: theme.palette.info.main }}>
                          <PeopleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Total Reach"
                        secondary={`${teacherStats?.totalStudents || 0} students across ${teacherStats?.totalCourses || 0} courses`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        )}

        {activeTab === 2 && (
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
            {/* Course List */}
            <Box sx={{ flex: '1 1 100%' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                    📚 Your Courses Performance
                  </Typography>
                  {courses.length === 0 ? (
                    <Alert severity="info">No courses found. Create your first course to see analytics!</Alert>
                  ) : (
                    <List>
                      {courses.map((course: any) => (
                        <ListItem
                          key={course._id}
                          sx={{
                            mb: 2,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 2,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                              <LibraryIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                  {course.title}
                                </Typography>
                                {course.isPublished && (
                                  <Chip label="Published" size="small" color="success" />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                                  <Chip
                                    size="small"
                                    icon={<PeopleIcon />}
                                    label={`${course.enrollmentCount || 0} students`}
                                  />
                                  <Chip
                                    size="small"
                                    icon={<StarIcon />}
                                    label={`${course.rating?.average?.toFixed(1) || '0.0'} rating`}
                                  />
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(((course.enrollmentCount || 0) / 50) * 100, 100)}
                                  sx={{ mt: 1, height: 8, borderRadius: 1 }}
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Stack>
        )}
      </Container>
    </Layout>
  );
};

export default Analytics;

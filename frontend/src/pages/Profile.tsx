import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Card,
  CardContent,
  Chip,
  Button,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  LinearProgress,
  Zoom,
  Slide,
  Grow,
  Divider,
  alpha,
  InputAdornment,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  PhotoCamera as PhotoCameraIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon,
  Grade as GradeIcon,
  AccessTime as TimeIcon,
  Notifications as NotificationsIcon,
  Visibility as VisibilityIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import axios from 'axios';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  dateOfBirth?: string;
  avatar?: string;
  role: string;
  department?: string;
  yearOfStudy?: string;
  interests?: string[];
  skills?: string[];
}

interface UserStats {
  coursesCompleted: number;
  assignmentsCompleted: number;
  totalPoints: number;
  currentLevel: number;
  averageGrade: number;
  studyTime: number;
  streak: number;
  rank: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedDate: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'student'
  });
  const [userStats, setUserStats] = useState<UserStats>({
    coursesCompleted: 0,
    assignmentsCompleted: 0,
    totalPoints: 0,
    currentLevel: 1,
    averageGrade: 0,
    studyTime: 0,
    streak: 0,
    rank: 0
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUserProfile();
    fetchUserStats();
    fetchAchievements();
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Backend returns user object directly, not wrapped in data property
      const userData = response.data;
      
      // Ensure skills are always arrays
      const skills = Array.isArray(userData.profile?.skills) ? userData.profile.skills : [];
      
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.profile?.phone || '',
        bio: userData.profile?.bio || '',
        location: userData.profile?.location || '',
        dateOfBirth: userData.profile?.dateOfBirth || '',
        avatar: userData.profile?.profilePicture || '',
        role: userData.role || 'student',
        department: userData.profile?.department || '',
        yearOfStudy: userData.profile?.yearOfStudy || '',
        interests: Array.isArray(userData.profile?.interests) ? userData.profile.interests : [],
        skills
      });
    } catch (error: any) {
      setError('Failed to load profile data');
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/analytics/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const stats = response.data.data || {};
      // Ensure all required fields exist with defaults
      setUserStats({
        coursesCompleted: stats.coursesCompleted || 0,
        assignmentsCompleted: stats.assignmentsCompleted || 0,
        totalPoints: stats.totalPoints || 0,
        currentLevel: stats.currentLevel || 1,
        averageGrade: stats.averageGrade || 0,
        studyTime: stats.studyTime || 0,
        streak: stats.streak || stats.streakDays || 0,
        rank: stats.rank || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default values on error
      setUserStats({
        coursesCompleted: 0,
        assignmentsCompleted: 0,
        totalPoints: 0,
        currentLevel: 1,
        averageGrade: 0,
        studyTime: 0,
        streak: 0,
        rank: 0
      });
    }
  };

  const fetchAchievements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/gamification/achievements', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const achievementsData = response.data.data || [];
      // Ensure it's always an array
      setAchievements(Array.isArray(achievementsData) ? achievementsData : []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setAchievements([]); // Set empty array on error
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file); // Backend expects 'profilePicture'

    try {
      setUploadProgress(10);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/profile/upload-picture', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        }
      });
      
      // Backend returns { profilePicture: '/uploads/profiles/...' }
      setProfileData(prev => ({ ...prev, avatar: response.data.profilePicture }));
      setSuccess('Avatar updated successfully!');
    } catch (error: any) {
      setError('Failed to upload avatar');
    } finally {
      setUploadProgress(0);
    }
  };

  const getAchievementColor = (rarity: string) => {
    const colors = {
      common: '#9e9e9e',
      rare: '#d97534',
      epic: '#9c27b0',
      legendary: '#ff9800'
    };
    return colors[rarity as keyof typeof colors] || '#9e9e9e';
  };

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateLevelProgress = () => {
    if (!userStats) return 0;
    const currentXP = (userStats.totalPoints || 0) % 1000;
    return (currentXP / 1000) * 100;
  };

  if (loading) {
    return (
      <Layout title="Profile">
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <CircularProgress size={60} />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout title="Profile">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Modern Profile Header */}
        <Grow in={true} timeout={800}>
          <Paper
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 30%, #34495e 60%, #1a2332 100%)',
              borderRadius: 4,
              p: 4,
              mb: 4,
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Animated Background Pattern */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                opacity: 0.5,
                animation: 'float 6s ease-in-out infinite'
              }}
            />
            
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems="center" gap={4}>
              {/* Avatar Section */}
              <Box position="relative">
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <Paper
                      elevation={4}
                      sx={{
                        p: 1,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4caf50, #45a049)',
                        cursor: 'pointer'
                      }}
                      component="label"
                    >
                      <PhotoCameraIcon sx={{ color: 'white', fontSize: 20 }} />
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                    </Paper>
                  }
                >
                  <Avatar
                    src={profileData?.avatar || ''}
                    sx={{
                      width: 120,
                      height: 120,
                      border: '4px solid rgba(255,255,255,0.3)',
                      fontSize: '3rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {profileData?.firstName?.[0]}{profileData?.lastName?.[0]}
                  </Avatar>
                </Badge>
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    sx={{ transform: 'translate(-50%, -50%)' }}
                  >
                    <CircularProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{ color: 'white' }}
                    />
                  </Box>
                )}
              </Box>

              {/* Profile Info */}
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Typography variant="h3" fontWeight="bold">
                    {profileData?.firstName || ''} {profileData?.lastName || ''}
                  </Typography>
                  <Chip
                    label={profileData?.role || 'student'}
                    sx={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 'bold',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}
                  />
                </Box>
                
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
                  {profileData?.bio || 'No bio available'}
                </Typography>
                
                <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
                  {profileData?.email && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <EmailIcon sx={{ opacity: 0.8 }} />
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {profileData.email}
                      </Typography>
                    </Box>
                  )}
                  {profileData?.location && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocationIcon sx={{ opacity: 0.8 }} />
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {profileData.location}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Level Progress */}
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6" fontWeight="bold">
                      Level {userStats?.currentLevel || 1}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {userStats?.totalPoints || 0} XP
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={calculateLevelProgress()}
                    sx={{
                      height: 12,
                      borderRadius: 6,
                      bgcolor: 'rgba(255,255,255,0.3)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #ffd700, #ffed4e)',
                        borderRadius: 6
                      }
                    }}
                  />
                </Box>
              </Box>

              {/* Quick Stats */}
              <Box display="flex" flexDirection="column" gap={2}>
                <Paper
                  elevation={4}
                  sx={{
                    p: 2,
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 3,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h4" fontWeight="bold" color="white">
                    #{userStats?.rank || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Global Rank
                  </Typography>
                </Paper>
                
                <Button
                  variant="outlined"
                  startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
                  onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                  disabled={saving}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      borderColor: 'white',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grow>

        {/* Statistics Cards */}
        <Box 
          display="grid" 
          gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
          gap={3} 
          sx={{ mb: 4 }}
        >
          {[
            { 
              title: 'Courses Completed', 
              value: userStats?.coursesCompleted || 0, 
              icon: <SchoolIcon />, 
              color: '#4caf50',
              gradient: 'linear-gradient(135deg, #4caf50, #45a049)'
            },
            { 
              title: 'Assignments Done', 
              value: userStats?.assignmentsCompleted || 0, 
              icon: <AssignmentIcon />, 
              color: '#d97534',
              gradient: 'linear-gradient(135deg, #d97534, #c86329)'
            },
            { 
              title: 'Average Grade', 
              value: `${(userStats?.averageGrade || 0).toFixed(1)}%`, 
              icon: <GradeIcon />, 
              color: '#ff9800',
              gradient: 'linear-gradient(135deg, #ff9800, #f57c00)'
            },
            { 
              title: 'Study Streak', 
              value: `${userStats?.streak || 0} days`, 
              icon: <TimelineIcon />, 
              color: '#9c27b0',
              gradient: 'linear-gradient(135deg, #9c27b0, #7b1fa2)'
            }
          ].map((stat, index) => (
            <Zoom in={true} timeout={600} style={{ transitionDelay: `${index * 100}ms` }} key={stat.title}>
              <Card
                sx={{
                  background: stat.gradient,
                  color: 'white',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: `0 12px 24px ${alpha(stat.color, 0.3)}`
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {stat.title}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Zoom>
          ))}
        </Box>

        {/* Tabbed Content */}
        <Paper elevation={4} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  px: 4,
                  py: 2
                },
                '& .Mui-selected': {
                  background: 'linear-gradient(135deg, #1a233222, #2c3e5022)'
                }
              }}
            >
              <Tab label="Overview" />
              <Tab label="Profile Information" />
              <Tab label="Skills & Achievements" />
              <Tab label="Settings" />
            </Tabs>
          </Box>

          <Box sx={{ p: 4 }}>
            {/* Overview Tab */}
            {activeTab === 0 && (
              <Slide direction="right" in={activeTab === 0} timeout={500}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>
                    📊 Learning Overview
                  </Typography>
                  
                  <Box 
                    display="grid" 
                    gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }} 
                    gap={3}
                  >
                    <Card sx={{ borderRadius: 3, p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" mb={3}>
                        📈 Progress Summary
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <TimeIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Total Study Time"
                            secondary={formatStudyTime(userStats?.studyTime || 0)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <TrophyIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Total Points Earned"
                            secondary={(userStats?.totalPoints || 0).toLocaleString()}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <StarIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Current Level"
                            secondary={`Level ${userStats?.currentLevel || 1}`}
                          />
                        </ListItem>
                      </List>
                    </Card>
                    
                    <Card sx={{ borderRadius: 3, p: 3, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="bold" mb={2}>
                        🎯 Current Goals
                      </Typography>
                      <Typography variant="body2" color="textSecondary" mb={3}>
                        Keep up the great work!
                      </Typography>
                      <Button
                        variant="contained"
                        sx={{
                          background: 'linear-gradient(135deg, #d97534, #c86329)',
                          borderRadius: 3,
                          px: 4
                        }}
                      >
                        View Goals
                      </Button>
                    </Card>
                  </Box>
                </Box>
              </Slide>
            )}

            {/* Profile Information Tab */}
            {activeTab === 1 && (
              <Slide direction="right" in={activeTab === 1} timeout={500}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>
                    👤 Profile Information
                  </Typography>
                  
                  <Box 
                    display="grid" 
                    gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} 
                    gap={3}
                  >
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileData?.firstName || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      disabled={!isEditing}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileData?.lastName || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      disabled={!isEditing}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      value={profileData?.email || ''}
                      disabled
                      variant="outlined"
                      sx={{ mb: 2 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Phone"
                      value={profileData.phone || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      variant="outlined"
                      sx={{ mb: 2 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Box>
                  <TextField
                    fullWidth
                    label="Bio"
                    value={profileData?.bio || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing}
                    variant="outlined"
                    multiline
                    rows={3}
                    sx={{ mb: 2 }}
                  />
                  <Box 
                    display="grid" 
                    gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} 
                    gap={3}
                  >
                    <TextField
                      fullWidth
                      label="Location"
                      value={profileData?.location || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                      disabled={!isEditing}
                      variant="outlined"
                      sx={{ mb: 2 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      type="date"
                      value={profileData?.dateOfBirth || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      disabled={!isEditing}
                      variant="outlined"
                      sx={{ mb: 2 }}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Box>
                </Box>
              </Slide>
            )}

            {/* Skills & Achievements Tab */}
            {activeTab === 2 && (
              <Slide direction="right" in={activeTab === 2} timeout={500}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>
                    🏆 Skills & Achievements
                  </Typography>
                  
                  <Box 
                    display="grid" 
                    gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} 
                    gap={3}
                  >
                    {/* Skills Section */}
                    <Card sx={{ borderRadius: 3, p: 3, height: '100%' }}>
                      <Typography variant="h6" fontWeight="bold" mb={3}>
                        🎯 Skills
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {(() => {
                          const skillsArray = Array.isArray(profileData?.skills) && profileData.skills.length > 0
                            ? profileData.skills
                            : ['JavaScript', 'React', 'Python', 'Machine Learning'];
                          return skillsArray.map((skill, index) => (
                            <Chip
                              key={`skill-${index}-${skill}`}
                              label={skill}
                              variant="outlined"
                              color="primary"
                              sx={{ borderRadius: 2 }}
                            />
                          ));
                        })()}
                      </Box>
                    </Card>
                    
                    {/* Achievements Section */}
                    <Card sx={{ borderRadius: 3, p: 3, height: '100%' }}>
                      <Typography variant="h6" fontWeight="bold" mb={3}>
                        🏅 Recent Achievements
                      </Typography>
                      <List dense>
                        {Array.isArray(achievements) && achievements.length > 0 ? (
                          achievements.slice(0, 3).map((achievement, index) => (
                            <ListItem key={achievement.id || index} sx={{ px: 0 }}>
                              <ListItemIcon>
                                <Badge
                                  sx={{
                                    '& .MuiBadge-badge': {
                                      backgroundColor: getAchievementColor(achievement.rarity),
                                      color: 'white'
                                    }
                                  }}
                                >
                                  <TrophyIcon sx={{ color: getAchievementColor(achievement.rarity) }} />
                                </Badge>
                              </ListItemIcon>
                              <ListItemText
                                primary={achievement.title}
                                secondary={achievement.description}
                              />
                            </ListItem>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary" align="center">
                            No achievements yet
                          </Typography>
                        )}
                      </List>
                    </Card>
                  </Box>
                </Box>
              </Slide>
            )}

            {/* Settings Tab */}
            {activeTab === 3 && (
              <Slide direction="right" in={activeTab === 3} timeout={500}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>
                    ⚙️ Account Settings
                  </Typography>
                  
                  <Box 
                    display="grid" 
                    gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} 
                    gap={3}
                  >
                    <Card sx={{ borderRadius: 3, p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" mb={3}>
                        🔒 Security
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <LockIcon />
                          </ListItemIcon>
                          <ListItemText primary="Change Password" />
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setPasswordDialogOpen(true)}
                          >
                            Change
                          </Button>
                        </ListItem>
                        <Divider />
                        <ListItem>
                          <ListItemIcon>
                            <VisibilityIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Profile Visibility"
                            secondary="Make your profile visible to others"
                          />
                          <Switch defaultChecked />
                        </ListItem>
                      </List>
                    </Card>
                    
                    <Card sx={{ borderRadius: 3, p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" mb={3}>
                        🔔 Notifications
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <NotificationsIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Email Notifications"
                            secondary="Receive updates via email"
                          />
                          <Switch defaultChecked />
                        </ListItem>
                        <Divider />
                        <ListItem>
                          <ListItemIcon>
                            <AssignmentIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Assignment Reminders"
                            secondary="Get reminded about deadlines"
                          />
                          <Switch defaultChecked />
                        </ListItem>
                      </List>
                    </Card>
                  </Box>
                  
                  {/* Danger Zone */}
                  <Card 
                    sx={{ 
                      borderRadius: 3, 
                      p: 3, 
                      mt: 3,
                      border: '2px solid #f44336',
                      background: alpha('#f44336', 0.05)
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold" color="error" mb={2}>
                      ⚠️ Danger Zone
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={3}>
                      These actions cannot be undone. Please proceed with caution.
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Delete Account
                    </Button>
                  </Card>
                </Box>
              </Slide>
            )}
          </Box>
        </Paper>

        {/* Password Change Dialog */}
        <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              variant="outlined"
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              variant="outlined"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" color="primary">
              Update Password
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Account Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle color="error">Delete Account</DialogTitle>
          <DialogContent>
            <Typography variant="body1" mb={2}>
              Are you sure you want to delete your account? This action cannot be undone.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              All your data, including courses, assignments, and progress will be permanently removed.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" color="error">
              Delete Account
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default Profile;

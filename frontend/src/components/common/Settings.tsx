import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Chip,
  Paper,
  Container,
  Avatar,
  Badge,
  Zoom,
  Slide,
  Grow,
  useTheme,
  alpha,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Fab
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  DarkMode,
  LightMode,
  AutoMode,
  Smartphone,
  Computer,
  VolumeUp,
  VibrationOutlined,
  Email,
  Campaign,
  Assignment,
  School,
  Visibility,
  VisibilityOff,
  Public,
  Lock,
  Group,
  Star,
  Celebration
} from '@mui/icons-material';
import ThemeSwitcher from './ThemeSwitcher';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import '../../styles/themes.css';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ open, onClose }) => {
  const { theme: currentTheme } = useCustomTheme();
  const muiTheme = useTheme();
  const [activeCategory, setActiveCategory] = useState(0);

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    marketing: false,
    assignments: true,
    courses: true,
    sound: true,
    vibration: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showActivity: true,
    showProgress: true,
    showOnlineStatus: true,
  });

  const [appearance, setAppearance] = useState({
    theme: currentTheme,
    fontSize: 'medium',
    animations: true,
    compactView: false,
  });

  const handleNotificationChange = (key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  const handlePrivacyChange = (key: string) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  const handleAppearanceChange = (key: string, value: any) => {
    setAppearance(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Modern categories with enhanced icons and colors
  const categories = [
    {
      id: 0,
      label: 'Appearance',
      icon: <PaletteIcon />,
      color: '#667eea',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: 'Customize your visual experience'
    },
    {
      id: 1,
      label: 'Notifications',
      icon: <NotificationsIcon />,
      color: '#f093fb',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      description: 'Manage your notification preferences'
    },
    {
      id: 2,
      label: 'Privacy & Security',
      icon: <SecurityIcon />,
      color: '#4ecdc4',
      gradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
      description: 'Control your privacy settings'
    },
    {
      id: 3,
      label: 'Account',
      icon: <SettingsIcon />,
      color: '#feca57',
      gradient: 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)',
      description: 'Account and general settings'
    }
  ];

  const themeDisplayName = {
    light: 'Light',
    dark: 'Dark',
    blue: 'Ocean Blue',
    purple: 'Purple Dream',
    green: 'Nature Green'
  }[currentTheme];

  const getPrivacyIcon = () => {
    if (privacy.profileVisibility === 'public') return <Public />;
    if (privacy.profileVisibility === 'students-only') return <Group />;
    return <Lock />;
  };

  const getPrivacyColor = () => {
    if (privacy.profileVisibility === 'public') return '#4caf50';
    if (privacy.profileVisibility === 'students-only') return '#2196f3';
    return '#f44336';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
          backdropFilter: 'blur(20px)',
          minHeight: '80vh',
          maxHeight: '90vh',
          overflow: 'hidden'
        }
      }}
    >
      {/* Modern Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          p: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
            animation: 'shimmer 3s ease-in-out infinite',
          },
          '@keyframes shimmer': {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' }
          }
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Paper
              elevation={4}
              sx={{
                p: 1.5,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <SettingsIcon sx={{ fontSize: 28, color: 'white' }} />
            </Paper>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Settings
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Customize your learning experience
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Close Settings">
            <Fab
              size="small"
              onClick={onClose}
              sx={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                '&:hover': {
                  background: 'rgba(255,255,255,0.3)',
                  transform: 'scale(1.1)'
                }
              }}
            >
              <CloseIcon />
            </Fab>
          </Tooltip>
        </Box>
      </Box>

      <Box display="flex" height="100%">
        {/* Modern Sidebar Navigation */}
        <Paper
          elevation={0}
          sx={{
            width: 300,
            background: 'linear-gradient(180deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            borderRight: '1px solid rgba(0,0,0,0.1)',
            p: 2
          }}
        >
          <Typography variant="h6" fontWeight="bold" color="primary" mb={2} px={1}>
            Categories
          </Typography>
          {categories.map((category, index) => (
            <Zoom in={true} key={category.id} style={{ transitionDelay: `${index * 100}ms` }}>
              <Paper
                elevation={activeCategory === category.id ? 4 : 0}
                onClick={() => setActiveCategory(category.id)}
                sx={{
                  p: 2,
                  mb: 1,
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: activeCategory === category.id 
                    ? category.gradient 
                    : 'transparent',
                  color: activeCategory === category.id ? 'white' : 'text.primary',
                  border: activeCategory === category.id 
                    ? 'none' 
                    : '1px solid rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateX(4px)',
                    boxShadow: activeCategory === category.id 
                      ? '0 8px 24px rgba(0,0,0,0.2)' 
                      : '0 4px 12px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      background: activeCategory === category.id 
                        ? 'rgba(255,255,255,0.2)' 
                        : `${category.color}22`,
                      color: activeCategory === category.id 
                        ? 'white' 
                        : category.color
                    }}
                  >
                    {category.icon}
                  </Box>
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {category.label}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: activeCategory === category.id ? 0.9 : 0.7,
                        fontSize: '0.75rem'
                      }}
                    >
                      {category.description}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Zoom>
          ))}
        </Paper>

        {/* Content Area */}
        <Box flex={1} sx={{ overflow: 'auto', maxHeight: 'calc(80vh - 120px)' }}>
          <Container maxWidth="md" sx={{ py: 3 }}>
            {/* Appearance Settings */}
            {activeCategory === 0 && (
              <Grow in={true} timeout={800}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>
                    🎨 Appearance Settings
                  </Typography>
                  
                  {/* Theme Selection */}
                  <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                      <PaletteIcon color="primary" />
                      <Typography variant="h6" fontWeight="bold">
                        Theme
                      </Typography>
                      <Chip
                        label={`Current: ${themeDisplayName}`}
                        size="small"
                        sx={{
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                    <ThemeSwitcher showInSettings />
                  </Paper>

                  {/* Display Options */}
                  <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" mb={3}>
                      🖥️ Display Options
                    </Typography>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }} gap={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={appearance.animations}
                            onChange={(e) => handleAppearanceChange('animations', e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Enable Animations"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={appearance.compactView}
                            onChange={(e) => handleAppearanceChange('compactView', e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Compact View"
                      />
                    </Box>
                  </Paper>
                </Box>
              </Grow>
            )}

            {/* Notifications Settings */}
            {activeCategory === 1 && (
              <Grow in={true} timeout={800}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>
                    🔔 Notification Settings
                  </Typography>
                  
                  {/* Email & Push Notifications */}
                  <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" mb={3}>
                      📧 Communication Preferences
                    </Typography>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          background: notifications.email 
                            ? 'linear-gradient(135deg, #4caf5022, #81c78411)' 
                            : 'linear-gradient(135deg, #f4433622, #ec407a11)',
                          border: `1px solid ${notifications.email ? '#4caf50' : '#f44336'}33`,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => handleNotificationChange('email')}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center" gap={2}>
                            <Email color={notifications.email ? 'success' : 'error'} />
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                Email Notifications
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                Receive updates via email
                              </Typography>
                            </Box>
                          </Box>
                          <Switch
                            checked={notifications.email}
                            onChange={() => handleNotificationChange('email')}
                            color="primary"
                          />
                        </Box>
                      </Box>
                      
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          background: notifications.push 
                            ? 'linear-gradient(135deg, #2196f322, #21caf022)' 
                            : 'linear-gradient(135deg, #f4433622, #ec407a11)',
                          border: `1px solid ${notifications.push ? '#2196f3' : '#f44336'}33`,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => handleNotificationChange('push')}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center" gap={2}>
                            <Smartphone color={notifications.push ? 'primary' : 'error'} />
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                Push Notifications
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                Browser notifications
                              </Typography>
                            </Box>
                          </Box>
                          <Switch
                            checked={notifications.push}
                            onChange={() => handleNotificationChange('push')}
                            color="primary"
                          />
                        </Box>
                      </Box>
                    </Box>
                  </Paper>

                  {/* Specific Notification Types */}
                  <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" mb={3}>
                      📚 Learning Notifications
                    </Typography>
                    <List sx={{ py: 0 }}>
                      {[
                        { key: 'assignments', icon: <Assignment />, title: 'Assignment Reminders', desc: 'Get reminded about upcoming assignments' },
                        { key: 'courses', icon: <School />, title: 'Course Updates', desc: 'Notifications about course changes' },
                        { key: 'marketing', icon: <Campaign />, title: 'Marketing Emails', desc: 'Promotional content and updates' },
                      ].map((item, index) => (
                        <ListItem
                          key={item.key}
                          sx={{
                            borderRadius: 2,
                            mb: 1,
                            background: notifications[item.key as keyof typeof notifications] 
                              ? alpha(muiTheme.palette.primary.main, 0.1) 
                              : 'transparent',
                            border: '1px solid',
                            borderColor: notifications[item.key as keyof typeof notifications] 
                              ? alpha(muiTheme.palette.primary.main, 0.3) 
                              : 'transparent'
                          }}
                        >
                          <ListItemIcon>
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 2,
                                background: notifications[item.key as keyof typeof notifications] 
                                  ? muiTheme.palette.primary.main 
                                  : alpha(muiTheme.palette.text.secondary, 0.1),
                                color: notifications[item.key as keyof typeof notifications] 
                                  ? 'white' 
                                  : muiTheme.palette.text.secondary
                              }}
                            >
                              {item.icon}
                            </Box>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography fontWeight="bold">
                                {item.title}
                              </Typography>
                            }
                            secondary={item.desc}
                          />
                          <ListItemSecondaryAction>
                            <Switch
                              checked={notifications[item.key as keyof typeof notifications]}
                              onChange={() => handleNotificationChange(item.key)}
                              color="primary"
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              </Grow>
            )}

            {/* Privacy & Security Settings */}
            {activeCategory === 2 && (
              <Grow in={true} timeout={800}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>
                    🔒 Privacy & Security
                  </Typography>
                  
                  {/* Profile Visibility */}
                  <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                      {getPrivacyIcon()}
                      <Typography variant="h6" fontWeight="bold">
                        Profile Visibility
                      </Typography>
                      <Chip
                        label={privacy.profileVisibility}
                        size="small"
                        sx={{
                          backgroundColor: getPrivacyColor(),
                          color: 'white',
                          fontWeight: 'bold',
                          textTransform: 'capitalize'
                        }}
                      />
                    </Box>
                    <ToggleButtonGroup
                      value={privacy.profileVisibility}
                      exclusive
                      onChange={(e, value) => value && setPrivacy(prev => ({ ...prev, profileVisibility: value }))}
                      fullWidth
                      sx={{ mb: 2 }}
                    >
                      <ToggleButton value="public" sx={{ flex: 1, py: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Public />
                          <Box textAlign="left">
                            <Typography variant="subtitle2" fontWeight="bold">Public</Typography>
                            <Typography variant="caption">Everyone can see</Typography>
                          </Box>
                        </Box>
                      </ToggleButton>
                      <ToggleButton value="students-only" sx={{ flex: 1, py: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Group />
                          <Box textAlign="left">
                            <Typography variant="subtitle2" fontWeight="bold">Students Only</Typography>
                            <Typography variant="caption">Students can see</Typography>
                          </Box>
                        </Box>
                      </ToggleButton>
                      <ToggleButton value="private" sx={{ flex: 1, py: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Lock />
                          <Box textAlign="left">
                            <Typography variant="subtitle2" fontWeight="bold">Private</Typography>
                            <Typography variant="caption">Only you can see</Typography>
                          </Box>
                        </Box>
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Paper>

                  {/* Activity Settings */}
                  <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" mb={3}>
                      👁️ Activity & Status
                    </Typography>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }} gap={2}>
                      <Box>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={privacy.showActivity}
                              onChange={() => handlePrivacyChange('showActivity')}
                              color="primary"
                            />
                          }
                          label="Show Activity Status"
                        />
                        <Typography variant="caption" color="textSecondary" display="block">
                          Let others see when you're online
                        </Typography>
                      </Box>
                      <Box>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={privacy.showProgress}
                              onChange={() => handlePrivacyChange('showProgress')}
                              color="primary"
                            />
                          }
                          label="Show Learning Progress"
                        />
                        <Typography variant="caption" color="textSecondary" display="block">
                          Display progress on public profile
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Box>
              </Grow>
            )}

            {/* Account Settings */}
            {activeCategory === 3 && (
              <Grow in={true} timeout={800}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary" mb={3}>
                    ⚙️ Account Settings
                  </Typography>
                  
                  {/* Quick Access Cards */}
                  <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }} gap={3}>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <LanguageIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                          Language
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="textSecondary" mb={2}>
                        Change your language preference
                      </Typography>
                      <Chip
                        label="English (US)"
                        variant="outlined"
                        color="primary"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Paper>
                    
                    <Paper
                      elevation={2}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <HelpIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                          Help & Support
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="textSecondary" mb={2}>
                        Get help and send feedback
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ borderRadius: 2 }}
                      >
                        Contact Support
                      </Button>
                    </Paper>
                  </Box>
                </Box>
              </Grow>
            )}
          </Container>
        </Box>
      </Box>

      {/* Modern Footer */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          p: 3
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <InfoIcon fontSize="small" color="primary" />
            <Typography variant="caption" color="textSecondary">
              Settings are automatically saved
            </Typography>
          </Box>
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: 3,
              fontWeight: 'bold',
              textTransform: 'none',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
              }
            }}
          >
            Done
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default Settings;

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Avatar,
  IconButton,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Paper,
  Chip,
} from '@mui/material';
import {
  Close,
  Palette,
  Person,
  Security,
  Notifications as NotificationsIcon,
  PhotoCamera,
  Visibility,
  VisibilityOff,
  Delete,
  Save,
  Upload,
  LightMode,
  DarkMode,
  AutoAwesome,
  Brush,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';

interface EnhancedSettingsProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  profilePicture?: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const EnhancedSettings: React.FC<EnhancedSettingsProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile data state
  const [profileData, setProfileData] = useState<UserProfile>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    location: user?.profile?.location || '',
    bio: user?.profile?.bio || '',
    profilePicture: user?.profile?.profilePicture || '',
  });

  // Password data state
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Theme selection state
  const [selectedTheme, setSelectedTheme] = useState(theme);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    desktop: false,
    marketing: false,
    assignmentReminders: true,
  });

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState(true);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.profile?.phone || '',
        location: user.profile?.location || '',
        bio: user.profile?.bio || '',
        profilePicture: user.profile?.profilePicture || '',
      });
    }
  }, [user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleThemeChange = (newTheme: string) => {
    const validTheme = newTheme as 'light' | 'dark' | 'blue' | 'purple' | 'green';
    setSelectedTheme(validTheme);
    setTheme(validTheme);
    localStorage.setItem('theme', validTheme);
    showSnackbar('Theme updated successfully!', 'success');
  };

  const handleProfileChange = (field: keyof UserProfile) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handlePasswordChange = (field: keyof PasswordData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/user/notifications', notifications, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Notification preferences saved!', 'success');
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || 'Failed to save preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileVisibilityToggle = async () => {
    const newValue = !profileVisibility;
    setProfileVisibility(newValue);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/user/profile-visibility', { visible: newValue }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar(`Profile is now ${newValue ? 'visible' : 'hidden'}`, 'success');
    } catch (error: any) {
      setProfileVisibility(!newValue); // Revert on error
      showSnackbar('Failed to update profile visibility', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleProfileSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        updateUser(response.data.user);
        showSnackbar('Profile updated successfully!', 'success');
      }
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange_Submit = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showSnackbar('New passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showSnackbar('Password must be at least 6 characters long', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/profile/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
        showSnackbar('Password changed successfully!', 'success');
      }
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDelete = async () => {
    if (deleteConfirm !== 'DELETE') {
      showSnackbar('Please type DELETE to confirm account deletion', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        showSnackbar('Account deleted successfully', 'success');
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
      }
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || 'Failed to delete account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/user/upload-avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setProfileData(prev => ({
          ...prev,
          profilePicture: response.data.profilePicture
        }));
        showSnackbar('Profile picture updated successfully!', 'success');
      }
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || 'Failed to upload profile picture', 'error');
    } finally {
      setLoading(false);
    }
  };

  const themeOptions = [
    { key: 'light', name: 'Light', icon: <LightMode />, color: '#ffffff' },
    { key: 'dark', name: 'Dark', icon: <DarkMode />, color: '#1a1a1a' },
    { key: 'blue', name: 'Ocean Blue', icon: <AutoAwesome />, color: '#0066cc' },
    { key: 'purple', name: 'Purple Galaxy', icon: <Brush />, color: '#6a0dad' },
    { key: 'gradient', name: 'Rainbow', icon: <Palette />, color: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)' },
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            minHeight: '70vh',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 700, color: '#000000' }}>
            Settings
          </Typography>
          <IconButton onClick={onClose} size="large">
            <Close />
          </IconButton>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab 
              icon={<Palette />} 
              label="Themes" 
              sx={{ color: '#000000', fontWeight: 600 }}
            />
            <Tab 
              icon={<Person />} 
              label="Profile" 
              sx={{ color: '#000000', fontWeight: 600 }}
            />
            <Tab 
              icon={<Security />} 
              label="Security" 
              sx={{ color: '#000000', fontWeight: 600 }}
            />
            <Tab 
              icon={<NotificationsIcon />} 
              label="Notifications" 
              sx={{ color: '#000000', fontWeight: 600 }}
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          {/* Theme Settings Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: '#000000' }}>
              Choose Your Theme
            </Typography>
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2
            }}>
              {themeOptions.map((themeOption) => (
                <Paper
                  key={themeOption.key}
                  elevation={selectedTheme === themeOption.key ? 8 : 2}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: selectedTheme === themeOption.key ? '2px solid #4facfe' : '2px solid transparent',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                    onClick={() => handleThemeChange(themeOption.key)}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          margin: '0 auto 16px',
                          borderRadius: '50%',
                          background: themeOption.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: themeOption.key === 'light' ? '#000000' : '#ffffff'
                        }}
                      >
                        {themeOption.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#000000' }}>
                        {themeOption.name}
                      </Typography>
                      {selectedTheme === themeOption.key && (
                        <Chip
                          label="Active"
                          color="primary"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Box>
                  </Paper>
                ))}
            </Box>
          </TabPanel>

          {/* Profile Settings Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: '#000000' }}>
              Profile Information
            </Typography>
            
            {/* Profile Picture Section */}
            <Card sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      src={profileData.profilePicture}
                      sx={{ width: 100, height: 100 }}
                    >
                      {profileData.firstName?.charAt(0) || 'U'}
                    </Avatar>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="profile-picture-upload"
                      type="file"
                      onChange={handleProfilePictureUpload}
                    />
                    <label htmlFor="profile-picture-upload">
                      <IconButton
                        component="span"
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' }
                        }}
                      >
                        <PhotoCamera />
                      </IconButton>
                    </label>
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#000000' }}>
                      Profile Picture
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666666' }}>
                      Click the camera icon to upload a new picture
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Profile Form */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={profileData.firstName}
                  onChange={handleProfileChange('firstName')}
                  InputLabelProps={{ sx: { color: '#000000' } }}
                  InputProps={{ sx: { color: '#000000' } }}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  value={profileData.lastName}
                  onChange={handleProfileChange('lastName')}
                  InputLabelProps={{ sx: { color: '#000000' } }}
                  InputProps={{ sx: { color: '#000000' } }}
                />
              </Box>
              
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={profileData.email}
                onChange={handleProfileChange('email')}
                InputLabelProps={{ sx: { color: '#000000' } }}
                InputProps={{ sx: { color: '#000000' } }}
              />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={profileData.phone}
                  onChange={handleProfileChange('phone')}
                  InputLabelProps={{ sx: { color: '#000000' } }}
                  InputProps={{ sx: { color: '#000000' } }}
                />
                <TextField
                  fullWidth
                  label="Location"
                  value={profileData.location}
                  onChange={handleProfileChange('location')}
                  InputLabelProps={{ sx: { color: '#000000' } }}
                  InputProps={{ sx: { color: '#000000' } }}
                />
              </Box>
              
              <TextField
                fullWidth
                label="Bio"
                multiline
                rows={3}
                value={profileData.bio}
                onChange={handleProfileChange('bio')}
                InputLabelProps={{ sx: { color: '#000000' } }}
                InputProps={{ sx: { color: '#000000' } }}
              />
            </Box>

            <Box sx={{ mt: 3, textAlign: 'right' }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleProfileSave}
                disabled={loading}
                sx={{ fontWeight: 600 }}
              >
                {loading ? <CircularProgress size={20} /> : 'Save Profile'}
              </Button>
            </Box>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 700, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security />
              Account Settings
            </Typography>

            {/* Security Section */}
            <Card sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{ 
                    bgcolor: 'rgba(255, 152, 0, 0.1)', 
                    p: 1.5, 
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Security sx={{ color: '#ff9800', fontSize: 28 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#000000' }}>
                    Security
                  </Typography>
                </Box>

                {/* Change Password */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Security sx={{ color: '#666666' }} />
                    <Typography sx={{ fontWeight: 500, color: '#000000' }}>
                      Change Password
                    </Typography>
                  </Box>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {showPasswordForm ? 'Cancel' : 'Change'}
                  </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Profile Visibility */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                      {profileVisibility ? <Visibility sx={{ color: '#666666' }} /> : <VisibilityOff sx={{ color: '#666666' }} />}
                      <Typography sx={{ fontWeight: 500, color: '#000000' }}>
                        Profile Visibility
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#666666', ml: 5 }}>
                      Make your profile visible to others
                    </Typography>
                  </Box>
                  <Switch
                    checked={profileVisibility}
                    onChange={handleProfileVisibilityToggle}
                    color="primary"
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Change Password Form (expanded) */}
            {showPasswordForm && (
              <Card sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#000000' }}>
                    Change Password
                  </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange('currentPassword')}
                    InputLabelProps={{ sx: { color: '#000000' } }}
                    InputProps={{
                      sx: { color: '#000000' },
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                        >
                          {showPassword.current ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      )
                    }}
                  />
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      fullWidth
                      label="New Password"
                      type={showPassword.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange('newPassword')}
                      InputLabelProps={{ sx: { color: '#000000' } }}
                      InputProps={{
                        sx: { color: '#000000' },
                        endAdornment: (
                          <IconButton
                            onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                          >
                            {showPassword.new ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        )
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Confirm New Password"
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange('confirmPassword')}
                      InputLabelProps={{ sx: { color: '#000000' } }}
                      InputProps={{
                        sx: { color: '#000000' },
                        endAdornment: (
                          <IconButton
                            onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                          >
                            {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        )
                      }}
                    />
                  </Box>
                </Box>
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  <Button
                    variant="contained"
                    onClick={handlePasswordChange_Submit}
                    disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
                    sx={{ fontWeight: 600 }}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Change Password'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
            )}

            {/* Delete Account Section - Danger Zone */}
            <Card sx={{ bgcolor: 'rgba(255, 235, 238, 1)', border: '2px solid #ef5350' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ 
                    bgcolor: 'rgba(239, 83, 80, 0.1)', 
                    p: 1.5, 
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Delete sx={{ color: '#d32f2f', fontSize: 28 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                    Danger Zone
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2, color: '#666666' }}>
                  These actions cannot be undone. Please proceed with caution.
                </Typography>
                <TextField
                  fullWidth
                  label="Type 'DELETE' to confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ sx: { color: '#000000' } }}
                  InputProps={{ sx: { color: '#000000' } }}
                />
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleAccountDelete}
                  disabled={loading || deleteConfirm !== 'DELETE'}
                  sx={{ 
                    fontWeight: 600,
                    textTransform: 'none',
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                      bgcolor: 'rgba(211, 47, 47, 0.04)'
                    }
                  }}
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Notifications Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 700, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsIcon />
              Account Settings
            </Typography>
            
            <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{ 
                    bgcolor: 'rgba(255, 193, 7, 0.1)', 
                    p: 1.5, 
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <NotificationsIcon sx={{ color: '#ffc107', fontSize: 28 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#000000' }}>
                    Notifications
                  </Typography>
                </Box>

                {/* Email Notifications */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                      <NotificationsIcon sx={{ color: '#666666' }} />
                      <Typography sx={{ fontWeight: 500, color: '#000000' }}>
                        Email Notifications
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#666666', ml: 5 }}>
                      Receive updates via email
                    </Typography>
                  </Box>
                  <Switch
                    checked={notifications.email}
                    onChange={() => handleNotificationChange('email')}
                    color="primary"
                  />
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Assignment Reminders */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                      <NotificationsIcon sx={{ color: '#666666' }} />
                      <Typography sx={{ fontWeight: 500, color: '#000000' }}>
                        Assignment Reminders
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#666666', ml: 5 }}>
                      Get reminded about deadlines
                    </Typography>
                  </Box>
                  <Switch
                    checked={notifications.assignmentReminders}
                    onChange={() => handleNotificationChange('assignmentReminders')}
                    color="primary"
                  />
                </Box>
              </CardContent>
            </Card>

            <Box sx={{ mt: 3, textAlign: 'right' }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveNotifications}
                disabled={loading}
                sx={{ fontWeight: 600 }}
              >
                {loading ? <CircularProgress size={20} /> : 'Save Preferences'}
              </Button>
            </Box>
          </TabPanel>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={onClose} sx={{ fontWeight: 600, color: '#666666' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EnhancedSettings;

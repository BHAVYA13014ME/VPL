import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Container,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  TextField,
  Alert,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School,
  People,
  Analytics,
  Settings,
  Save as SaveIcon,
} from '@mui/icons-material';
import Layout from '../../components/layout/Layout';

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Users', icon: <People />, path: '/admin/users' },
  { text: 'Courses', icon: <School />, path: '/admin/courses' },
  { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
  { text: 'Settings', icon: <Settings />, path: '/admin/settings' },
];

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    allowRegistration: true,
    requireEmailVerification: true,
    allowCourseCreation: true,
    maintenanceMode: false,
    platformName: 'Virtual Learning',
    maxFileSize: 10,
    sessionTimeout: 30,
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (field: string, value: any) => {
    setSettings({ ...settings, [field]: value });
    setSaved(false);
  };

  const handleSave = () => {
    // Here you would typically save to backend
    console.log('Saving settings:', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Layout title="Platform Settings">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Platform Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure system-wide settings and preferences
          </Typography>
        </Box>

        {saved && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Settings saved successfully!
          </Alert>
        )}

        {/* General Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TextField
              fullWidth
              label="Platform Name"
              value={settings.platformName}
              onChange={(e) => handleChange('platformName', e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="number"
              label="Max File Upload Size (MB)"
              value={settings.maxFileSize}
              onChange={(e) => handleChange('maxFileSize', parseInt(e.target.value))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="number"
              label="Session Timeout (minutes)"
              value={settings.sessionTimeout}
              onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
            />
          </CardContent>
        </Card>

        {/* User Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.allowRegistration}
                  onChange={(e) => handleChange('allowRegistration', e.target.checked)}
                />
              }
              label="Allow New User Registration"
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              When disabled, only admins can create new accounts
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.requireEmailVerification}
                  onChange={(e) => handleChange('requireEmailVerification', e.target.checked)}
                />
              }
              label="Require Email Verification"
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Users must verify their email before accessing the platform
            </Typography>
          </CardContent>
        </Card>

        {/* Course Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Course Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.allowCourseCreation}
                  onChange={(e) => handleChange('allowCourseCreation', e.target.checked)}
                />
              }
              label="Allow Teachers to Create Courses"
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
              When disabled, only admins can create new courses
            </Typography>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                  color="warning"
                />
              }
              label="Maintenance Mode"
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
              Enable this to prevent users from accessing the platform
            </Typography>
            {settings.maintenanceMode && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Platform is currently in maintenance mode!
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </Box>
      </Container>
    </Layout>
  );
};

export default AdminSettings;

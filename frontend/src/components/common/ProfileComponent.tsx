import React, { useState } from 'react';
import {
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Person,
  Settings,
  Logout,
  Notifications,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import EnhancedSettings from './EnhancedSettings';
import '../../styles/ProfileComponent.css';

interface ProfileComponentProps {
  user?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    role?: string;
    profile?: {
      profilePicture?: string;
    };
  } | null;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  notificationCount?: number;
  onLogout?: () => void;
  className?: string;
}

/**
 * Profile Component for VLP Dashboard
 * Displays user avatar with dropdown menu, notification badge, and online status
 * Matches the premium glass-morphism design of the dashboard
 */
const ProfileComponent: React.FC<ProfileComponentProps> = ({
  user: propUser,
  showOnlineStatus = true,
  isOnline = true,
  notificationCount = 0,
  onLogout,
  className = '',
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user: contextUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Use prop user or context user
  const user = propUser || contextUser;
  
  const open = Boolean(anchorEl);

  // Safe function to get user initials with multiple fallbacks
  const getUserInitials = (): string => {
    try {
      if (!user) return 'U';
      
      // Try firstName first
      if (user.firstName && typeof user.firstName === 'string' && user.firstName.length > 0) {
        return user.firstName.charAt(0).toUpperCase();
      }
      
      // Try fullName
      if (user.fullName && typeof user.fullName === 'string' && user.fullName.length > 0) {
        return user.fullName.charAt(0).toUpperCase();
      }
      
      // Try lastName if firstName fails
      if (user.lastName && typeof user.lastName === 'string' && user.lastName.length > 0) {
        return user.lastName.charAt(0).toUpperCase();
      }
      
      // Try email as fallback
      if (user.email && typeof user.email === 'string' && user.email.length > 0) {
        return user.email.charAt(0).toUpperCase();
      }
      
      // Ultimate fallback
      return 'U';
    } catch (error) {
      console.warn('ProfileComponent: Error getting user initials:', error);
      return 'U';
    }
  };

  // Safe function to get user display name
  const getUserDisplayName = (): string => {
    try {
      if (!user) return 'User';
      
      if (user.fullName && typeof user.fullName === 'string' && user.fullName.trim()) {
        return user.fullName;
      }
      
      if (user.firstName && user.lastName) {
        const firstName = typeof user.firstName === 'string' ? user.firstName : '';
        const lastName = typeof user.lastName === 'string' ? user.lastName : '';
        if (firstName || lastName) {
          return `${firstName} ${lastName}`.trim();
        }
      }
      
      if (user.firstName && typeof user.firstName === 'string' && user.firstName.trim()) {
        return user.firstName;
      }
      
      if (user.email && typeof user.email === 'string' && user.email.trim()) {
        return user.email;
      }
      
      return 'User';
    } catch (error) {
      console.warn('ProfileComponent: Error getting user display name:', error);
      return 'User';
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    handleClose();
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
    handleClose();
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
      navigate('/login');
    }
    handleClose();
  };

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const notificationOpen = Boolean(notificationAnchorEl);

  return (
    <Box className={`profile-component profile-container ${className}`} sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Notification Badge */}
      {notificationCount > 0 && (
        <Tooltip title={`${notificationCount} unread notifications`}>
          <IconButton 
            onClick={handleNotificationClick}
            sx={{ 
              mr: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(79, 172, 254, 0.3)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <Badge 
              badgeContent={notificationCount} 
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  minWidth: '18px',
                  height: '18px',
                  animation: 'pulse 2s infinite',
                },
              }}
            >
              <Notifications 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '1.2rem' 
                }} 
              />
            </Badge>
          </IconButton>
        </Tooltip>
      )}

      {/* Profile Avatar with Online Status */}
      <Tooltip title={getUserDisplayName()}>
        <IconButton
          onClick={handleClick}
          sx={{
            p: 0,
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 32px rgba(79, 172, 254, 0.4)',
              border: '2px solid rgba(79, 172, 254, 0.5)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <Avatar
            src={user?.profile?.profilePicture}
            sx={{
              width: 40,
              height: 40,
              background: user?.profile?.profilePicture 
                ? 'transparent' 
                : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            {getUserInitials()}
          </Avatar>
          
          {/* Online Status Indicator */}
          {showOnlineStatus && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: isOnline 
                  ? 'linear-gradient(135deg, #00ff88, #00cc6a)' 
                  : 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                border: '2px solid rgba(255, 255, 255, 0.9)',
                boxShadow: isOnline 
                  ? '0 0 8px rgba(0, 255, 136, 0.6)' 
                  : '0 0 8px rgba(255, 107, 107, 0.6)',
                animation: isOnline ? 'pulse 2s infinite' : 'none',
              }}
            />
          )}
        </IconButton>
      </Tooltip>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        id="profile-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
            mt: 1.5,
            minWidth: 200,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', borderRadius: '12px 12px 0 0' }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {getUserDisplayName()}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {user?.email || 'No email'}
          </Typography>
          {user?.role && (
            <Typography variant="caption" sx={{ 
              opacity: 0.9, 
              display: 'block',
              textTransform: 'capitalize',
              fontSize: '0.7rem'
            }}>
              {user.role}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 0 }} />

        {/* Menu Items */}
        <MenuItem 
          onClick={handleProfileClick}
          sx={{
            py: 1.5,
            px: 2,
            '&:hover': {
              background: 'rgba(79, 172, 254, 0.1)',
              transform: 'translateX(4px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <ListItemIcon sx={{ color: '#4facfe' }}>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" fontWeight="500">View Profile</Typography>
          </ListItemText>
        </MenuItem>

        <MenuItem 
          onClick={handleSettingsClick}
          sx={{
            py: 1.5,
            px: 2,
            '&:hover': {
              background: 'rgba(79, 172, 254, 0.1)',
              transform: 'translateX(4px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <ListItemIcon sx={{ color: '#4facfe' }}>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" fontWeight="500">Settings</Typography>
          </ListItemText>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem 
          onClick={handleLogoutClick}
          sx={{
            py: 1.5,
            px: 2,
            '&:hover': {
              background: 'rgba(255, 107, 107, 0.1)',
              transform: 'translateX(4px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <ListItemIcon sx={{ color: '#ff6b6b' }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" fontWeight="500" color="#ff6b6b">Logout</Typography>
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={notificationOpen}
        onClose={handleNotificationClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 320,
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Notifications Header */}
        <Box sx={{ 
          px: 2, 
          py: 1.5, 
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)', 
          color: 'white', 
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="subtitle2" fontWeight="bold">
            Notifications
          </Typography>
          <Badge badgeContent={notificationCount} color="warning" />
        </Box>

        <Divider sx={{ my: 0 }} />

        {/* Sample Notifications */}
        <MenuItem sx={{ py: 1.5, px: 2, whiteSpace: 'normal' }}>
          <Box>
            <Typography variant="body2" fontWeight="600" color="primary">
              New Assignment Posted
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Check out the latest assignment in your course
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              2 hours ago
            </Typography>
          </Box>
        </MenuItem>

        <Divider />

        <MenuItem sx={{ py: 1.5, px: 2, whiteSpace: 'normal' }}>
          <Box>
            <Typography variant="body2" fontWeight="600" color="primary">
              Course Update Available
            </Typography>
            <Typography variant="caption" color="text.secondary">
              New materials have been added to your course
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              5 hours ago
            </Typography>
          </Box>
        </MenuItem>

        <Divider />

        <MenuItem sx={{ py: 1.5, px: 2, whiteSpace: 'normal' }}>
          <Box>
            <Typography variant="body2" fontWeight="600" color="primary">
              Upcoming Deadline
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Assignment due in 2 days
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              1 day ago
            </Typography>
          </Box>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem 
          onClick={handleNotificationClose}
          sx={{
            py: 1.5,
            px: 2,
            justifyContent: 'center',
            '&:hover': {
              background: 'rgba(79, 172, 254, 0.1)',
            },
          }}
        >
          <Typography variant="body2" fontWeight="500" color="primary">
            View All Notifications
          </Typography>
        </MenuItem>
      </Menu>

      {/* Enhanced Settings Dialog */}
      <EnhancedSettings 
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
};

export default ProfileComponent;

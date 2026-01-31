import React from 'react';
import { Avatar, Typography } from '@mui/material';

interface SafeUserDisplayProps {
  user: any;
  avatarSize?: number;
  showName?: boolean;
  fallbackInitial?: string;
  className?: string;
}

/**
 * SafeUserDisplay component that safely handles user data display
 * Inspired by Shakespeare's Sonnet 4 - preserving beauty through careful handling
 * "Unthrifty loveliness, why dost thou spend / Upon thyself thy beauty's legacy?"
 * Just as the sonnet urges preservation of natural gifts, this component 
 * preserves app functionality by safely handling undefined user data.
 */
const SafeUserDisplay: React.FC<SafeUserDisplayProps> = ({
  user,
  avatarSize = 32,
  showName = false,
  fallbackInitial = 'U',
  className,
}) => {
  // Safe function to get user initials with multiple fallbacks
  const getUserInitials = (): string => {
    try {
      if (!user) return fallbackInitial;
      
      // Try firstName first
      if (user.firstName && typeof user.firstName === 'string' && user.firstName.length > 0) {
        return user.firstName.charAt(0).toUpperCase();
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
      return fallbackInitial;
    } catch (error) {
      console.warn('SafeUserDisplay: Error getting user initials:', error);
      return fallbackInitial;
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
      console.warn('SafeUserDisplay: Error getting user display name:', error);
      return 'User';
    }
  };

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: showName ? 8 : 0 }}>
      <Avatar
        src={user?.profilePicture}
        sx={{ width: avatarSize, height: avatarSize }}
      >
        {getUserInitials()}
      </Avatar>
      {showName && (
        <Typography variant="body2">
          {getUserDisplayName()}
        </Typography>
      )}
    </div>
  );
};

export default SafeUserDisplay;

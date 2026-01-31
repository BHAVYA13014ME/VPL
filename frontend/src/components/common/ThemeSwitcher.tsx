import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  ClickAwayListener,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Gradient as GradientIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import '../../styles/themes.css';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    icon: <LightModeIcon />,
    description: 'Clean and bright interface'
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: <DarkModeIcon />,
    description: 'Easy on the eyes'
  },
  {
    value: 'blue',
    label: 'Ocean Blue',
    icon: <GradientIcon />,
    description: 'Cool blue gradient'
  },
  {
    value: 'purple',
    label: 'Purple Dream',
    icon: <GradientIcon />,
    description: 'Elegant purple tones'
  },
  {
    value: 'green',
    label: 'Nature Green',
    icon: <GradientIcon />,
    description: 'Fresh green gradient'
  }
];

interface ThemeSwitcherProps {
  compact?: boolean;
  showInSettings?: boolean;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ 
  compact = false, 
  showInSettings = false 
}) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme = themeOptions.find(option => option.value === theme);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClickAway = () => {
    setIsOpen(false);
  };

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  if (compact) {
    return (
      <ClickAwayListener onClickAway={handleClickAway}>
        <Box className="theme-switcher" sx={{ position: 'relative' }}>
          <Tooltip title={`Current theme: ${currentTheme?.label}`}>
            <IconButton
              onClick={handleToggle}
              className="theme-switcher-button"
              sx={{
                background: 'var(--theme-bg-card)',
                color: 'var(--theme-text-primary)',
                border: '1px solid var(--theme-border)',
                '&:hover': {
                  background: 'var(--theme-bg-secondary)',
                }
              }}
            >
              <PaletteIcon />
            </IconButton>
          </Tooltip>
          
          {isOpen && (
            <Box
              ref={dropdownRef}
              className="theme-switcher-dropdown"
              sx={{
                position: 'absolute',
                top: '100%',
                right: 0,
                mt: 1,
                minWidth: 200,
                zIndex: 1300,
              }}
            >
              {themeOptions.map((option) => (
                <Box
                  key={option.value}
                  className={`theme-option ${theme === option.value ? 'active' : ''}`}
                  onClick={() => handleThemeChange(option.value)}
                  sx={{
                    cursor: 'pointer',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    '&:hover': {
                      background: 'var(--theme-bg-secondary)',
                    }
                  }}
                >
                  <Box className={`theme-preview ${option.value}`} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" className="themed-text-primary">
                      {option.label}
                    </Typography>
                    <Typography variant="caption" className="themed-text-secondary">
                      {option.description}
                    </Typography>
                  </Box>
                  {theme === option.value && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--theme-gradient)',
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </ClickAwayListener>
    );
  }

  return (
    <Box className="theme-switcher-full" sx={{ width: '100%' }}>
      <Typography variant="h6" className="themed-text-primary" sx={{ mb: 2 }}>
        Theme Settings
      </Typography>
      <Typography variant="body2" className="themed-text-secondary" sx={{ mb: 3 }}>
        Choose your preferred dashboard theme
      </Typography>
      
      <Box sx={{ display: 'grid', gap: 2 }}>
        {themeOptions.map((option) => (
          <Box
            key={option.value}
            className={`theme-option ${theme === option.value ? 'active' : ''}`}
            onClick={() => handleThemeChange(option.value)}
            sx={{
              cursor: 'pointer',
              p: 2,
              borderRadius: 2,
              border: theme === option.value ? '2px solid' : '1px solid',
              borderColor: theme === option.value 
                ? 'var(--theme-text-primary)' 
                : 'var(--theme-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'var(--theme-bg-secondary)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px var(--theme-shadow)',
              }
            }}
          >
            <Box
              className={`theme-preview ${option.value}`}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                border: '2px solid var(--theme-border)',
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="subtitle1" 
                className="themed-text-primary"
                sx={{ fontWeight: theme === option.value ? 600 : 400 }}
              >
                {option.label}
              </Typography>
              <Typography variant="body2" className="themed-text-secondary">
                {option.description}
              </Typography>
            </Box>
            {theme === option.value && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'var(--theme-gradient)',
                  }}
                />
                <Typography variant="caption" className="themed-text-primary">
                  Active
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {showInSettings && (
        <Box sx={{ mt: 3, p: 2, borderRadius: 2, background: 'var(--theme-bg-secondary)' }}>
          <Typography variant="caption" className="themed-text-secondary">
            💡 Your theme preference is automatically saved and will persist across sessions.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ThemeSwitcher;

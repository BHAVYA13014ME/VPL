import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('dark');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard-theme') as Theme;
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      setThemeState(savedTheme);
    } else {
      setThemeState('dark');
    }
  }, []);

  // Apply theme to document body and save to localStorage
  useEffect(() => {
    // Remove existing theme classes
    document.body.classList.remove('theme-light', 'theme-dark');
    
    // Add current theme class
    document.body.classList.add(`theme-${theme}`);
    
    // Save to localStorage
    localStorage.setItem('dashboard-theme', theme);
    
    // Set CSS custom properties for dynamic theming
    const root = document.documentElement;
    switch (theme) {
      case 'light':
        root.style.setProperty('--theme-bg-primary', '#ffffff');
        root.style.setProperty('--theme-bg-secondary', '#f8f9fa');
        root.style.setProperty('--theme-bg-card', '#ffffff');
        root.style.setProperty('--theme-text-primary', '#212529');
        root.style.setProperty('--theme-text-secondary', '#6c757d');
        root.style.setProperty('--theme-border', '#dee2e6');
        root.style.setProperty('--theme-shadow', 'rgba(0, 0, 0, 0.1)');
        root.style.setProperty('--theme-gradient', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
        break;
      case 'dark':
        root.style.setProperty('--theme-bg-primary', '#111827');
        root.style.setProperty('--theme-bg-secondary', '#1a2332');
        root.style.setProperty('--theme-bg-card', '#1e2940');
        root.style.setProperty('--theme-text-primary', '#e8dcc4');
        root.style.setProperty('--theme-text-secondary', 'rgba(232, 220, 196, 0.65)');
        root.style.setProperty('--theme-border', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--theme-shadow', 'rgba(0, 0, 0, 0.5)');
        root.style.setProperty('--theme-accent', '#d97534');
        root.style.setProperty('--theme-gradient', 'linear-gradient(135deg, #1a2332 0%, #2c3e50 100%)');
        break;
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

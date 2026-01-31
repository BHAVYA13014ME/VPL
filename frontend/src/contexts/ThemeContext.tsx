import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'blue' | 'purple' | 'green';

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
  const [theme, setThemeState] = useState<Theme>('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'blue', 'purple', 'green'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }
  }, []);

  // Apply theme to document body and save to localStorage
  useEffect(() => {
    // Remove existing theme classes
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-blue', 'theme-purple', 'theme-green');
    
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
        root.style.setProperty('--theme-bg-primary', '#121212');
        root.style.setProperty('--theme-bg-secondary', '#1e1e1e');
        root.style.setProperty('--theme-bg-card', '#2d2d2d');
        root.style.setProperty('--theme-text-primary', '#ffffff');
        root.style.setProperty('--theme-text-secondary', '#b3b3b3');
        root.style.setProperty('--theme-border', '#404040');
        root.style.setProperty('--theme-shadow', 'rgba(0, 0, 0, 0.3)');
        root.style.setProperty('--theme-gradient', 'linear-gradient(135deg, #434343 0%, #000000 100%)');
        break;
      case 'blue':
        root.style.setProperty('--theme-bg-primary', 'linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)');
        root.style.setProperty('--theme-bg-secondary', '#3a42b5');
        root.style.setProperty('--theme-bg-card', 'rgba(255, 255, 255, 0.1)');
        root.style.setProperty('--theme-text-primary', '#ffffff');
        root.style.setProperty('--theme-text-secondary', '#e8eaff');
        root.style.setProperty('--theme-border', 'rgba(255, 255, 255, 0.2)');
        root.style.setProperty('--theme-shadow', 'rgba(78, 84, 200, 0.3)');
        root.style.setProperty('--theme-gradient', 'linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)');
        break;
      case 'purple':
        root.style.setProperty('--theme-bg-primary', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
        root.style.setProperty('--theme-bg-secondary', '#5a3f8a');
        root.style.setProperty('--theme-bg-card', 'rgba(255, 255, 255, 0.1)');
        root.style.setProperty('--theme-text-primary', '#ffffff');
        root.style.setProperty('--theme-text-secondary', '#f0e6ff');
        root.style.setProperty('--theme-border', 'rgba(255, 255, 255, 0.2)');
        root.style.setProperty('--theme-shadow', 'rgba(118, 75, 162, 0.3)');
        root.style.setProperty('--theme-gradient', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
        break;
      case 'green':
        root.style.setProperty('--theme-bg-primary', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)');
        root.style.setProperty('--theme-bg-secondary', '#0f8679');
        root.style.setProperty('--theme-bg-card', 'rgba(255, 255, 255, 0.1)');
        root.style.setProperty('--theme-text-primary', '#ffffff');
        root.style.setProperty('--theme-text-secondary', '#e6fff9');
        root.style.setProperty('--theme-border', 'rgba(255, 255, 255, 0.2)');
        root.style.setProperty('--theme-shadow', 'rgba(17, 153, 142, 0.3)');
        root.style.setProperty('--theme-gradient', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)');
        break;
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'blue', 'purple', 'green'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

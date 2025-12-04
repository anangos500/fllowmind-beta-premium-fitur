
import React, { createContext, useContext, useState, useEffect, useCallback, PropsWithChildren } from 'react';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';
type AppTheme = 'default' | 'nature' | 'ocean' | 'sunset' | 'purple' | 'pink';

interface ThemeContextValue {
  theme: Theme;
  appTheme: AppTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [appTheme, setAppTheme] = useState<AppTheme>('default');
  
  const { profile } = useAuth();

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);
  
  // Watch for profile changes to update custom theme
  useEffect(() => {
      // The ShopItem IDs are stored as "theme_nature", "theme_ocean", etc.
      // We need to strip the "theme_" prefix to match our CSS class logic.
      const rawTheme = profile?.equipped?.theme;
      
      if (rawTheme && rawTheme !== 'default') {
          // Remove 'theme_' prefix if present
          const cleanTheme = rawTheme.replace('theme_', '') as AppTheme;
          setAppTheme(cleanTheme);
      } else {
          setAppTheme('default');
      }
  }, [profile?.equipped?.theme]);
  
  useEffect(() => {
    const root = document.documentElement;
    
    // 1. Dark Mode
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    // 2. Custom App Themes (inject class to <html>)
    // Removing old theme classes to prevent conflict
    root.classList.remove('theme-nature', 'theme-ocean', 'theme-sunset', 'theme-purple', 'theme-pink');
    
    if (appTheme !== 'default') {
        root.classList.add(`theme-${appTheme}`);
    }

  }, [theme, appTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const value = { theme, appTheme, toggleTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
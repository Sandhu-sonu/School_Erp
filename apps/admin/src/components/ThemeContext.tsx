'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type SystemTheme = 'light' | 'dark' | 'system';
export type BrandColor = 'blue' | 'green' | 'purple' | 'red' | 'orange';

interface ThemeContextProps {
  theme: SystemTheme;
  brandColor: BrandColor;
  setTheme: (t: SystemTheme) => void;
  setBrandColor: (c: BrandColor) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<SystemTheme>('light');
  const [brandColor, setBrandColorState] = useState<BrandColor>('blue');

  useEffect(() => {
    // Read from localStorage
    const savedTheme = localStorage.getItem('erp-theme') as SystemTheme;
    const savedColor = localStorage.getItem('erp-brand-color') as BrandColor;

    if (savedTheme) setThemeState(savedTheme);
    if (savedColor) setBrandColorState(savedColor);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove previous brand color classes
    root.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-red', 'theme-orange');
    root.classList.add(`theme-${brandColor}`);
    localStorage.setItem('erp-brand-color', brandColor);
  }, [brandColor]);

  useEffect(() => {
    const root = window.document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (t: SystemTheme) => {
      root.classList.remove('light', 'dark');
      if (t === 'system') {
        const systemDark = media.matches;
        root.classList.add(systemDark ? 'dark' : 'light');
      } else {
        root.classList.add(t);
      }
    };

    applyTheme(theme);
    localStorage.setItem('erp-theme', theme);

    const listener = () => {
      if (theme === 'system') applyTheme('system');
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (t: SystemTheme) => setThemeState(t);
  const setBrandColor = (c: BrandColor) => setBrandColorState(c);

  return (
    <ThemeContext.Provider value={{ theme, brandColor, setTheme, setBrandColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

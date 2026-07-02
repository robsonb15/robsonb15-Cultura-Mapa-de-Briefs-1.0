import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface AccessibilityContextType {
  fontSize: number;
  highContrast: boolean;
  theme: Theme;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  toggleHighContrast: () => void;
  toggleTheme: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSize, setFontSize] = useState(1); // 1 = 100% (base 16px)
  const [highContrast, setHighContrast] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const savedFontSize = localStorage.getItem('accessibility-font-size');
    const savedHighContrast = localStorage.getItem('accessibility-high-contrast');
    const savedTheme = localStorage.getItem('accessibility-theme');

    if (savedFontSize) setFontSize(parseFloat(savedFontSize));
    if (savedHighContrast) setHighContrast(savedHighContrast === 'true');
    if (savedTheme) setTheme(savedTheme as Theme);
  }, []);

  useEffect(() => {
    localStorage.setItem('accessibility-font-size', fontSize.toString());
    document.documentElement.style.fontSize = `${fontSize * 16}px`;
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('accessibility-high-contrast', highContrast.toString());
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('accessibility-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 0.1, 1.5));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 0.1, 0.8));
  const resetFontSize = () => setFontSize(1);
  const toggleHighContrast = () => setHighContrast(prev => !prev);
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        highContrast,
        theme,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
        toggleHighContrast,
        toggleTheme,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

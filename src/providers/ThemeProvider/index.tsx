import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { THEME_KEY } from '../../modules/storage';

type Theme = 'light' | 'dark';
interface ThemeContextValue { toggleTheme: () => void }
const ThemeContext = createContext<ThemeContextValue | null>(null);

const readTheme = (): Theme | null => {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === 'light' || theme === 'dark' ? theme : null;
  } catch {
    return null;
  }
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState(readTheme);

  useLayoutEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  }, [theme]);

  const toggleTheme = () => {
    const currentTheme = theme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // Theme changes still apply when browser storage is disabled.
    }
  };

  return <ThemeContext.Provider value={{ toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider.');
  return context;
};

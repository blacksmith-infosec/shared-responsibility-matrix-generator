import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { THEME_KEY } from '../../modules/storage';
import { ThemeProvider, useTheme } from './index';

const Toggle = () => {
  const { toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>Toggle</button>;
};

describe('theme preference', () => {
  it('uses OS colors until a preference is selected and persisted', () => {
    render(<ThemeProvider><Toggle /></ThemeProvider>);
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('restores the original storage key', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    render(<ThemeProvider><Toggle /></ThemeProvider>);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('toggles from dark OS preference when storage is inaccessible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    render(<ThemeProvider><Toggle /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});

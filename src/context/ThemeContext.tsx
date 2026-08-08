/**
 * Light / dark / follow-the-system, persisted.
 *
 * The resolved theme is applied as a `.dark` class on <html>; the Tailwind
 * `dark:` variant keys off that class, so "system" and the manual toggle go
 * through exactly one code path.
 */

import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export const THEME_MODE = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODE)[number];
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'crm.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isThemeMode(value: string | null): value is ThemeMode {
  const modes: readonly string[] = THEME_MODE;
  return value !== null && modes.includes(value);
}

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isThemeMode(stored) ? stored : 'system';
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [systemPreference, setSystemPreference] =
    useState<ResolvedTheme>(systemTheme);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      setSystemPreference(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, []);

  const resolved: ResolvedTheme = mode === 'system' ? systemPreference : mode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  const value: ThemeContextValue = {
    mode,
    resolved,
    setMode: (next) => {
      localStorage.setItem(STORAGE_KEY, next);
      setModeState(next);
    },
  };

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

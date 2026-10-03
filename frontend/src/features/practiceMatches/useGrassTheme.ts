import { useCallback, useEffect, useState } from 'react';

type ThemeChoice = 'light' | 'dark';

const STORAGE_KEY = 'cup.practiceMatches.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readChoice(): ThemeChoice | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

/** Dark mode for the practice-match section: follows the OS until the user picks, then remembers. */
export function useGrassTheme(): { isDark: boolean; toggle: () => void } {
  const [choice, setChoice] = useState<ThemeChoice | null>(readChoice);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent): void => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const isDark = choice ? choice === 'dark' : systemDark;

  const toggle = useCallback((): void => {
    const next: ThemeChoice = isDark ? 'light' : 'dark';
    setChoice(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked — the choice lasts for this visit only.
    }
  }, [isDark]);

  return { isDark, toggle };
}

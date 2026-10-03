import { Moon, Plus, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useGrassTheme } from '@/features/practiceMatches/useGrassTheme';
import { cn } from '@/lib/cn';

/** Shell for the practice-match board: own theme (light/dark), header and routes. Independent of cups. */
export function PracticeLayout(): JSX.Element {
  const { t } = useTranslation();
  const { isDark, toggle } = useGrassTheme();
  const { pathname } = useLocation();
  const onCreatePage = pathname === '/matcher/ny';

  return (
    <div className={cn('theme-grass flex min-h-screen flex-col bg-background text-foreground', isDark && 'dark')}>
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 flex-col">
          <Link to="/" className="text-sm font-semibold text-muted-foreground hover:underline">
            {t('practice.nav.home')}
          </Link>
          <Link to="/matcher" className="font-display text-2xl font-extrabold tracking-tight">
            {t('practice.nav.title')}
          </Link>
        </div>
        <div className="flex-1" />
        <LanguageSwitcher />
        <button
          type="button"
          onClick={toggle}
          aria-label={t('practice.nav.toggleTheme')}
          aria-pressed={isDark}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-input bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
        </button>
        {!onCreatePage && (
          <Link
            to="/matcher/ny"
            className="hidden h-11 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            {t('practice.nav.postMatch')}
          </Link>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 sm:px-6 sm:pb-16">
        <Outlet />
      </main>
      {!onCreatePage && (
        <Link
          to="/matcher/ny"
          className="fixed bottom-5 right-4 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          {t('practice.nav.postMatch')}
        </Link>
      )}
    </div>
  );
}

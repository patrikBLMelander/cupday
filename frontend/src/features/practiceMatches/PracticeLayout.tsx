import { Moon, Plus, Sun, Trophy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { PostChooserSheet } from '@/features/postedCups/PostChooserSheet';
import { useGrassTheme } from '@/features/practiceMatches/useGrassTheme';
import { cn } from '@/lib/cn';
import { SITE_OWNER_EMAIL } from '@/lib/siteContact';

/** Shell for the practice-match board: own theme (light/dark), header and routes. Independent of cups. */
export function PracticeLayout(): JSX.Element {
  const { t } = useTranslation();
  const { isDark, toggle } = useGrassTheme();
  const { pathname } = useLocation();
  const onCreatePage = pathname === '/matcher/ny' || pathname === '/matcher/ny-cup';
  const [chooserOpen, setChooserOpen] = useState(false);
  const closeChooser = useCallback(() => setChooserOpen(false), []);

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
            to="/matcher/ny-cup"
            className="hidden h-11 items-center gap-2 rounded-full border-2 border-amber-800 bg-card px-5 font-bold text-amber-900 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-950/40"
          >
            <Trophy className="h-5 w-5" aria-hidden="true" />
            {t('postedCup.nav.postCup')}
          </Link>
        )}
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-6 px-4 pb-28 pt-4 text-sm sm:px-6 sm:pb-10">
        <a
          href={`mailto:${SITE_OWNER_EMAIL}?subject=${encodeURIComponent(t('practice.nav.feedbackSubject'))}`}
          className="inline-flex min-h-11 items-center text-muted-foreground underline hover:text-foreground"
        >
          {t('practice.nav.feedback')}
        </a>
        <Link to="/matcher/integritet" className="inline-flex min-h-11 items-center text-muted-foreground underline hover:text-foreground">
          {t('practice.nav.privacy')}
        </Link>
      </footer>
      {!onCreatePage && (
        <button
          type="button"
          onClick={() => setChooserOpen(true)}
          className="fixed bottom-5 right-4 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          {t('postedCup.nav.post')}
        </button>
      )}
      <PostChooserSheet open={chooserOpen} onClose={closeChooser} />
    </div>
  );
}

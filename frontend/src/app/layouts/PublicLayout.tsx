import { skipToken } from '@reduxjs/toolkit/query';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useParams } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { CupNotFoundPage } from '@/features/cups/CupNotFoundPage';
import { useGetCupBySlugQuery } from '@/features/cups/cupsApi';
import type { Cup } from '@/features/cups/cupTypes';

export type PublicCupOutletContext = { cup: Cup };

export function PublicLayout(): JSX.Element {
  const { slug } = useParams();
  const { t } = useTranslation();
  const { data: cup, isLoading, isError } = useGetCupBySlugQuery(
    slug ?? skipToken,
  );

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center"
      >
        <span className="sr-only">{t('common.loading')}</span>
        <div
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"
        />
      </div>
    );
  }

  if (isError || !cup) {
    return <CupNotFoundPage />;
  }

  const themeStyle = {
    '--primary': cup.organizingClubColors.primary,
    '--accent': cup.organizingClubColors.accent,
  } as CSSProperties;

  const context: PublicCupOutletContext = { cup };

  return (
    <div
      className="flex min-h-screen flex-col bg-background text-foreground"
      style={themeStyle}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
        <Link
          to={`/c/${cup.slug}`}
          className="text-lg font-semibold tracking-tight"
        >
          {cup.name}
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6">
        <Outlet context={context} />
      </main>
    </div>
  );
}

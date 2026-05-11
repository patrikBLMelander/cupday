import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Countdown } from '@/components/Countdown';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { PitchLines } from '@/components/PitchLines';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useListPublicCupsQuery } from '@/features/cups/cupsApi';
import type { Cup } from '@/features/cups/cupTypes';

export function PublicLandingPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { data: cups, isLoading, isError } = useListPublicCupsQuery();

  const dateFormatter = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? 'sv',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );

  const nextCup = useMemo(() => findNextCup(cups), [cups]);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 text-foreground">
      <section
        className="relative isolate overflow-hidden text-white"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 60% 50% at 20% 0%, hsl(45 100% 65% / 0.18), transparent 60%)',
            'radial-gradient(ellipse 60% 50% at 80% 0%, hsl(195 100% 60% / 0.18), transparent 60%)',
            'radial-gradient(ellipse 80% 60% at 50% 100%, hsl(150 60% 30% / 0.5), transparent 70%)',
            'linear-gradient(to bottom, hsl(150 55% 9%), hsl(220 50% 11%))',
          ].join(', '),
        }}
      >
        <PitchLines
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full text-white"
          style={{ height: '60%' }}
        />
        <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight">
            {t('app.title')}
          </span>
          <LanguageSwitcher />
        </header>

        <div className="relative z-10 px-4 py-16 text-center sm:px-6 sm:py-24">
          <h1 className="text-5xl font-bold tracking-tight drop-shadow-sm sm:text-6xl">
            {t('landing.heroTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            {t('landing.heroSubtitle')}
          </p>
          {nextCup && (
            <NextCupCountdown cup={nextCup} dateFormatter={dateFormatter} t={t} />
          )}
        </div>
      </section>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">
          {t('landing.upcomingTitle')}
        </h2>

        {isLoading && (
          <p role="status" aria-live="polite" className="text-muted-foreground">
            {t('common.loading')}
          </p>
        )}

        {isError && (
          <p role="alert" className="text-sm text-destructive">
            {t('landing.loadFailed')}
          </p>
        )}

        {!isLoading && !isError && cups && cups.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t('landing.empty')}
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && cups && cups.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {cups.map((cup) => (
              <li key={cup.id}>
                <CupCard cup={cup} dateFormatter={dateFormatter} t={t} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function CupCard({
  cup,
  dateFormatter,
  t,
}: {
  cup: Cup;
  dateFormatter: Intl.DateTimeFormat;
  t: (key: string, opts?: Record<string, unknown>) => string;
}): JSX.Element {
  const remaining = Math.max(0, cup.maxTeams - cup.activeTeamCount);
  const isFull = cup.status === 'full' || remaining === 0;

  const primary = `hsl(${cup.organizingClubColors.primary})`;
  const accent = `hsl(${cup.organizingClubColors.accent})`;
  const initial = cup.organizingClubName.trim().charAt(0).toUpperCase() || '?';
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(cup.clubLogoUrl) && !logoFailed;

  return (
    <Card
      className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg"
      style={{
        '--primary': cup.organizingClubColors.primary,
        '--accent': cup.organizingClubColors.accent,
      } as React.CSSProperties}
    >
      <div className="h-2 w-full" style={{ backgroundColor: primary }} />

      <CardHeader className="flex flex-row items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold"
          style={{ backgroundColor: accent, color: primary }}
        >
          {showLogo ? (
            <img
              src={cup.clubLogoUrl}
              alt=""
              className="h-full w-full object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span aria-hidden="true">{initial}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg">{cup.name}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {cup.organizingClubName}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <dl className="grid gap-1 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t('public.info.dates')}</dt>
            <dd>
              {dateFormatter.format(new Date(cup.startDate))}
              {' – '}
              {dateFormatter.format(new Date(cup.endDate))}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t('public.info.venue')}</dt>
            <dd className="text-right">{cup.venueName}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">
              {t('admin.cupForm.playersPerTeam')}
            </dt>
            <dd>{t('landing.card.playersLabel', { n: cup.playersPerTeam })}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {isFull ? (
            <Badge variant="secondary">{t('landing.card.full')}</Badge>
          ) : (
            <Badge>
              {t('landing.card.spotsLeft', { count: remaining })}
            </Badge>
          )}
          <Button asChild size="sm">
            <Link to={`/c/${cup.slug}`}>{t('landing.card.viewCta')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Finds the first cup whose start date is today or in the future. */
function findNextCup(cups: Cup[] | undefined): Cup | null {
  if (!cups || cups.length === 0) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    cups.find((cup) => parseCupStart(cup).getTime() >= today.getTime()) ?? null
  );
}

/** Treat the date-only startDate as local-midnight so the countdown aligns
 *  with the user's calendar day, not UTC midnight. */
function parseCupStart(cup: Cup): Date {
  return new Date(`${cup.startDate}T00:00:00`);
}

function NextCupCountdown({
  cup,
  dateFormatter,
  t,
}: {
  cup: Cup;
  dateFormatter: Intl.DateTimeFormat;
  t: (key: string, opts?: Record<string, unknown>) => string;
}): JSX.Element {
  return (
    <div className="mt-10">
      <Countdown
        target={parseCupStart(cup)}
        label={t('landing.countdown.title')}
        subline={
          <Link
            to={`/c/${cup.slug}`}
            className="text-sm font-medium text-white/90 underline-offset-4 hover:underline"
          >
            {cup.name} · {dateFormatter.format(parseCupStart(cup))}
          </Link>
        }
      />
    </div>
  );
}

import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { Cup } from '@/features/cups/cupTypes';
import { cupDayCount, formatCupTimes, formatDateSpan } from '@/features/postedCups/postedCupFormat';
import { levelRangeLabel } from '@/features/practiceMatches/practiceMatchFormat';
import { cn } from '@/lib/cn';

/** Gold cup card shown on a cup's first day in the match feed — clearly not a match. */
export function CupFeedCard({ cup }: { cup: Cup }): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  const days = cupDayCount(cup.startDate, cup.endDate);
  const remaining = Math.max(0, cup.maxTeams - cup.activeTeamCount);
  const takenPercent = Math.round((cup.activeTeamCount / Math.max(1, cup.maxTeams)) * 100);
  const isOpen = cup.status === 'open' && remaining > 0;
  const times = formatCupTimes(cup.startTime, cup.endTime);
  const chips = [
    (cup.ageClasses ?? []).join(' · '),
    t('practice.formatLabel', { n: cup.playersPerTeam }),
    cup.levelMin != null && cup.levelMax != null ? levelRangeLabel(t, cup.levelMin, cup.levelMax) : '',
    t('postedCup.feed.fee', { fee: cup.registrationFeeSek }),
  ].filter(Boolean);

  return (
    <article
      aria-label={t('postedCup.feed.ariaLabel', { name: cup.name })}
      className="flex flex-wrap items-center gap-4 rounded-[20px] border border-amber-300 bg-amber-50 p-4 text-foreground sm:gap-5 sm:p-5 dark:border-amber-700 dark:bg-amber-950/40"
    >
      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-800 text-white sm:h-16 sm:w-16">
        <Trophy className="h-7 w-7 sm:h-8 sm:w-8" />
      </span>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-amber-800 px-2 py-0.5 text-xs font-extrabold tracking-widest text-white">{t('postedCup.feed.badge')}</span>
          <span className="text-sm font-bold text-amber-900 dark:text-amber-300">
            {formatDateSpan(cup.startDate, cup.endDate, locale)}
            {days > 1 && ` · ${t('postedCup.feed.days', { count: days })}`}
            {times && ` · ${times}`}
          </span>
        </div>
        <Link to={`/c/${cup.slug}`} className="font-display text-xl font-extrabold leading-tight hover:underline sm:text-2xl">
          {cup.name}
        </Link>
        <div className="text-sm text-muted-foreground">
          {cup.organizingClubName} · {cup.venueName}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full bg-card px-2.5 py-0.5 text-sm font-bold">
              {chip}
            </span>
          ))}
        </div>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-56">
        <div>
          <div className={cn('text-sm font-bold', isOpen ? 'text-amber-900 dark:text-amber-300' : 'text-muted-foreground')}>
            {isOpen ? t('postedCup.feed.spotsLeft', { remaining, max: cup.maxTeams }) : t('postedCup.feed.full')}
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-card">
            <div className="h-1.5 bg-amber-800" style={{ width: `${takenPercent}%` }} />
          </div>
          {cup.registrationDeadline && (
            <div className="mt-1 text-xs text-muted-foreground">
              {t('postedCup.feed.deadline', { date: formatDateSpan(cup.registrationDeadline, cup.registrationDeadline, locale) })}
            </div>
          )}
        </div>
        <Link
          to={`/c/${cup.slug}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-amber-800 px-4 font-bold text-white hover:bg-amber-900"
        >
          {t('postedCup.feed.cta')}
        </Link>
      </div>
    </article>
  );
}

/** Slim reminder on day 2+ of a multi-day cup, so the cup isn't repeated in full. */
export function CupDayRow({ cup, day, days }: { cup: Cup; day: number; days: number }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
      <Trophy className="h-4 w-4" aria-hidden="true" />
      <span>{t('postedCup.feed.ongoing', { name: cup.name, day, days })}</span>
      <Link to={`/c/${cup.slug}`} className="ml-auto inline-flex min-h-9 items-center font-bold underline">
        {t('postedCup.feed.viewCup')}
      </Link>
    </div>
  );
}

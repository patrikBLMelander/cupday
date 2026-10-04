import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { LevelMeter, NextBadge, RoleBadge, SlotsStatus } from '@/features/practiceMatches/MatchBits';
import type { MatchRole } from '@/features/practiceMatches/practiceMatchFeed';
import {
  formatLabel,
  formatTime,
  levelRangeLabel,
  matchAgeLabel,
} from '@/features/practiceMatches/practiceMatchFormat';
import type { PracticeMatch } from '@/features/practiceMatches/practiceMatchTypes';
import { cn } from '@/lib/cn';

export interface MatchItemProps {
  match: PracticeMatch;
  role: MatchRole | null;
  isNext: boolean;
}

function BookLink({ match, size = 'md' }: { match: PracticeMatch; size?: 'md' | 'lg' }): JSX.Element {
  const { t } = useTranslation();
  const isFull = match.freeSlots === 0;
  return (
    <Link
      to={`/matcher/${match.id}`}
      aria-label={`${isFull ? t('practice.list.show') : t('practice.list.book')}: ${match.teamName}`}
      className={cn(
        'inline-flex items-center justify-center rounded-full px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        size === 'lg' ? 'min-h-11 px-5' : 'min-h-10',
        isFull
          ? 'border border-input text-muted-foreground hover:bg-muted'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
      )}
    >
      {isFull ? t('practice.list.show') : t('practice.list.book')}
    </Link>
  );
}

/** Desktop list row — dense overview, one line per match. */
export const MatchRow = memo(function MatchRow({ match, role, isNext }: MatchItemProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  return (
    <li
      className={cn(
        'grid min-w-[1000px] grid-cols-[76px_minmax(180px,1.6fr)_64px_72px_190px_minmax(160px,1.4fr)_150px_96px] items-center gap-3 border-t border-border px-4 py-3 first:border-t-0',
        isNext && 'bg-accent',
        match.freeSlots === 0 && 'opacity-60',
      )}
    >
      <span className="flex flex-col">
        <span className="font-display text-2xl font-extrabold leading-none">{formatTime(match.kickoffAt, locale)}</span>
        <span className="mt-1 text-xs font-semibold text-muted-foreground">–{formatTime(match.endsAt, locale)}</span>
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Link to={`/matcher/${match.id}`} className="text-base font-bold hover:underline">
          {match.teamName}
        </Link>
        {isNext && <NextBadge />}
        {role && <RoleBadge role={role} />}
      </div>
      <span className="font-semibold">{matchAgeLabel(match)}</span>
      <span className="justify-self-start rounded-lg border border-input px-2 font-display text-lg font-bold">
        {formatLabel(t, match.playersPerSide)}
      </span>
      <span className="flex items-center gap-2.5">
        <LevelMeter min={match.levelMin} max={match.levelMax} />
        <span className="font-semibold">{levelRangeLabel(t, match.levelMin, match.levelMax)}</span>
      </span>
      <span className="text-sm text-muted-foreground">{match.venue}</span>
      <SlotsStatus free={match.freeSlots} total={match.opponentSlots} />
      <span className="text-right">
        <BookLink match={match} />
      </span>
    </li>
  );
});

/** Desktop card — the "Kort" view. */
export const MatchCard = memo(function MatchCard({ match, role, isNext }: MatchItemProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  return (
    <li
      className={cn(
        'flex flex-col gap-3.5 rounded-[20px] border bg-card p-5',
        isNext ? 'border-primary' : 'border-border',
        match.freeSlots === 0 && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-5xl font-extrabold leading-none">{formatTime(match.kickoffAt, locale)}</span>
          <span className="text-sm font-semibold text-muted-foreground">–{formatTime(match.endsAt, locale)}</span>
        </span>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-[10px] border border-input px-2.5 py-0.5 font-display text-xl font-bold">
            {formatLabel(t, match.playersPerSide)}
          </span>
          {isNext && <NextBadge />}
        </div>
      </div>
      <div>
        <Link to={`/matcher/${match.id}`} className="text-lg font-bold hover:underline">
          {match.teamName}
        </Link>
        <div className="mt-0.5 text-sm text-muted-foreground">{match.venue}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-muted px-2.5 py-1 text-sm font-semibold">{matchAgeLabel(match)}</span>
        <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1 text-sm font-semibold">
          <LevelMeter min={match.levelMin} max={match.levelMax} size="sm" />
          {levelRangeLabel(t, match.levelMin, match.levelMax)}
        </span>
        {role && <RoleBadge role={role} />}
      </div>
      <div className="mt-auto flex items-center gap-3 border-t border-border pt-3">
        <div className="flex-1">
          <SlotsStatus free={match.freeSlots} total={match.opponentSlots} />
        </div>
        <BookLink match={match} size="lg" />
      </div>
    </li>
  );
});

/** Mobile card — the whole card links to the match page. */
export const MatchCompactCard = memo(function MatchCompactCard({ match, role, isNext }: MatchItemProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  return (
    <li>
      <Link
        to={`/matcher/${match.id}`}
        className={cn(
          'flex gap-3 rounded-2xl border p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isNext ? 'border-primary bg-accent' : 'border-border bg-card',
          match.freeSlots === 0 && 'opacity-60',
        )}
      >
        <div className="w-[52px] shrink-0">
          <div className="font-display text-xl font-extrabold leading-tight">{formatTime(match.kickoffAt, locale)}</div>
          <div className="text-xs font-semibold text-muted-foreground">–{formatTime(match.endsAt, locale)}</div>
          {isNext && (
            <span className="mt-1.5 inline-block">
              <NextBadge />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <span className="font-bold">{match.teamName}</span>
            <span className="shrink-0">
              <SlotsStatus free={match.freeSlots} total={match.opponentSlots} showBar={false} />
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {matchAgeLabel(match)} · {formatLabel(t, match.playersPerSide)} · {match.venue}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <LevelMeter min={match.levelMin} max={match.levelMax} size="sm" />
            <span className="text-sm font-semibold">{levelRangeLabel(t, match.levelMin, match.levelMax)}</span>
            {role && <RoleBadge role={role} />}
          </div>
        </div>
      </Link>
    </li>
  );
});

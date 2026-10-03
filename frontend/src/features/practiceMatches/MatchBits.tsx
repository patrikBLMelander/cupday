import { useTranslation } from 'react-i18next';

import type { MatchRole } from '@/features/practiceMatches/practiceMatchFeed';
import { MAX_LEVEL } from '@/features/practiceMatches/practiceMatchTypes';
import { cn } from '@/lib/cn';

const LEVELS_PER_GROUP = 3;

/** Nine ticks in three groups (Lätt / Medel / Svår), filled up to the level. Decorative — pair with text. */
export function LevelMeter({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' }): JSX.Element {
  return (
    <span aria-hidden="true" className="inline-flex items-end gap-0.5">
      {Array.from({ length: MAX_LEVEL }, (_, i) => (
        <span
          key={i}
          className={cn(
            'rounded-sm',
            size === 'sm' ? 'h-2.5 w-1' : 'h-3.5 w-[5px]',
            i > 0 && i % LEVELS_PER_GROUP === 0 && 'ml-[3px]',
            i < level ? 'bg-primary' : 'bg-input',
          )}
        />
      ))}
    </span>
  );
}

export function SlotsStatus({ free, total, showBar = true }: { free: number; total: number; showBar?: boolean }): JSX.Element {
  const { t } = useTranslation();
  const isFull = free === 0;
  const takenPercent = Math.round(((total - free) / total) * 100);
  return (
    <div className="min-w-0">
      <div className={cn('text-sm font-bold', isFull ? 'text-muted-foreground' : 'text-accent-foreground')}>
        {isFull ? t('practice.fullyBooked') : t('practice.slotsFree', { free, count: total })}
      </div>
      {showBar && (
        <div className="mt-1.5 h-1 overflow-hidden rounded bg-border">
          <div
            className={cn('h-1', isFull ? 'bg-muted-foreground' : 'bg-primary')}
            style={{ width: `${takenPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function NextBadge(): JSX.Element {
  const { t } = useTranslation();
  return (
    <span className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-foreground">
      {t('practice.next')}
    </span>
  );
}

export function RoleBadge({ role }: { role: MatchRole }): JSX.Element {
  const { t } = useTranslation();
  return (
    <span className="rounded-md border border-accent-foreground px-1.5 py-px text-[11px] font-bold text-accent-foreground">
      {role === 'organizer' ? t('practice.roleOrganizer') : t('practice.roleOpponent')}
    </span>
  );
}

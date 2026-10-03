import { useTranslation } from 'react-i18next';

import { localDateKey } from '@/features/practiceMatches/practiceMatchFeed';
import { cn } from '@/lib/cn';

interface DateStripProps {
  days: Date[];
  counts: ReadonlyMap<string, number>;
  selected: string | null;
  onSelect: (dateKey: string | null) => void;
}

/** Horizontal day picker with per-day match counts. "Alla datum" clears the selection. */
export function DateStrip({ days, counts, selected, onSelect }: DateStripProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const todayKey = localDateKey(new Date());

  return (
    <div role="group" aria-label={t('practice.list.dates')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={cn(
          'min-h-16 shrink-0 rounded-[14px] border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected === null ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
        )}
      >
        {t('practice.list.allDates')}
      </button>
      {days.map((day) => {
        const key = localDateKey(day);
        const count = counts.get(key) ?? 0;
        const isSelected = selected === key;
        const label = key === todayKey ? t('practice.list.today') : weekday.format(day);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={isSelected}
            aria-label={`${label} ${day.getDate()}, ${t('practice.list.matchCount', { count })}`}
            className={cn(
              'flex min-h-16 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[14px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
              !isSelected && count === 0 && 'text-muted-foreground',
            )}
          >
            <span className="text-[11px] font-semibold capitalize">{label}</span>
            <span className="font-display text-xl font-extrabold leading-none">{day.getDate()}</span>
            <span
              className={cn(
                'text-[11px] font-bold',
                isSelected ? 'text-primary-foreground' : count > 0 ? 'text-accent-foreground' : 'text-muted-foreground',
              )}
            >
              {count > 0 ? t('practice.list.dayCount', { count }) : '–'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

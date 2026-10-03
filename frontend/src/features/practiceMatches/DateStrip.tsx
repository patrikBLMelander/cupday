import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { localDateKey } from '@/features/practiceMatches/practiceMatchFeed';
import { cn } from '@/lib/cn';

interface DateStripProps {
  days: Date[];
  counts: ReadonlyMap<string, number>;
  selected: string | null;
  onSelect: (dateKey: string | null) => void;
  onPrev: () => void;
  onNext: () => void;
  /** Hover/focus on "next" — lets the page prefetch the following window. */
  onNextIntent?: () => void;
  canGoBack: boolean;
  onPickDate: (dateKey: string) => void;
}

const arrowClass =
  'inline-flex min-h-16 w-10 shrink-0 items-center justify-center rounded-[14px] border border-border bg-card hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:hover:bg-card';

/**
 * Two-week day picker. Arrows page a week at a time, the calendar button jumps to any date.
 * Clicking the selected day again shows the whole window.
 */
export function DateStrip({
  days,
  counts,
  selected,
  onSelect,
  onPrev,
  onNext,
  onNextIntent,
  canGoBack,
  onPickDate,
}: DateStripProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'sv';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const todayKey = localDateKey(new Date());
  const pickerRef = useRef<HTMLInputElement>(null);

  function openPicker(): void {
    const input = pickerRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={openPicker}
          aria-label={t('practice.list.pickDate')}
          className="inline-flex min-h-16 w-14 flex-col items-center justify-center gap-0.5 rounded-[14px] border border-primary bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] font-bold">{t('practice.list.calendar')}</span>
        </button>
        <input
          ref={pickerRef}
          type="date"
          min={todayKey}
          tabIndex={-1}
          aria-hidden="true"
          value={selected ?? ''}
          onChange={(e) => e.target.value && onPickDate(e.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
      <button type="button" onClick={onPrev} disabled={!canGoBack} aria-label={t('practice.list.prevWeek')} className={arrowClass}>
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <div role="group" aria-label={t('practice.list.dates')} className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const key = localDateKey(day);
          const count = counts.get(key) ?? 0;
          const isSelected = selected === key;
          const label = key === todayKey ? t('practice.list.today') : weekday.format(day);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(isSelected ? null : key)}
              aria-pressed={isSelected}
              aria-label={`${label} ${day.getDate()}/${day.getMonth() + 1}, ${t('practice.list.matchCount', { count })}`}
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
      <button
        type="button"
        onClick={onNext}
        onMouseEnter={onNextIntent}
        onFocus={onNextIntent}
        aria-label={t('practice.list.nextWeek')}
        className={arrowClass}
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

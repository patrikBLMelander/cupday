import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { levelLabel, levelRangeLabel } from '@/features/practiceMatches/practiceMatchFormat';
import { LEVEL_KEYS } from '@/features/practiceMatches/practiceMatchTypes';
import { cn } from '@/lib/cn';

interface LevelRangePickerProps {
  min: number;
  max: number;
  onChange: (range: { min: number; max: number }) => void;
}

/**
 * Nine level chips. First tap picks a single level; a second tap extends it to a range
 * (in either direction). The next tap starts over.
 */
export function LevelRangePicker({ min, max, onChange }: LevelRangePickerProps): JSX.Element {
  const { t } = useTranslation();
  const labelId = useId();
  const [anchor, setAnchor] = useState<number | null>(null);

  function pick(level: number): void {
    if (anchor === null) {
      setAnchor(level);
      onChange({ min: level, max: level });
    } else {
      setAnchor(null);
      onChange({ min: Math.min(anchor, level), max: Math.max(anchor, level) });
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-semibold">
        {t('practice.form.level')}
      </span>
      <div role="group" aria-labelledby={labelId} className="grid grid-cols-3 gap-1.5">
        {LEVEL_KEYS.map((_, i) => {
          const level = i + 1;
          const inRange = level >= min && level <= max;
          const isEnd = level === min || level === max;
          return (
            <button
              key={level}
              type="button"
              onClick={() => pick(level)}
              aria-pressed={inRange}
              className={cn(
                'min-h-11 rounded-xl border px-1 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                inRange && isEnd && 'border-primary bg-primary text-primary-foreground',
                inRange && !isEnd && 'border-primary bg-accent text-accent-foreground',
                !inRange && 'border-input bg-card',
              )}
            >
              {levelLabel(t, level)}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="text-sm">
        <span className="font-semibold">{t('practice.form.levelSelected', { level: levelRangeLabel(t, min, max) })}</span>{' '}
        <span className="text-muted-foreground">
          {anchor === null ? t('practice.form.levelHowTo') : t('practice.form.levelPickSecond')}
        </span>
      </p>
      <p className="text-sm text-muted-foreground">{t('practice.form.levelHint')}</p>
    </div>
  );
}

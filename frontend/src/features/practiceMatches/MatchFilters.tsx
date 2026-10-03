import { X } from 'lucide-react';
import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_FILTERS, type MatchFilters } from '@/features/practiceMatches/practiceMatchFeed';
import { levelLabel, formatLabel } from '@/features/practiceMatches/practiceMatchFormat';
import { LEVEL_KEYS, PLAYERS_PER_SIDE, type PlayersPerSide } from '@/features/practiceMatches/practiceMatchTypes';
import { cn } from '@/lib/cn';

interface FilterControlsProps {
  filters: MatchFilters;
  onChange: (next: MatchFilters) => void;
  ageOptions: string[];
  layout: 'bar' | 'sheet';
}

const selectClass =
  'min-h-11 rounded-xl border border-input bg-card px-3 font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Format, age, level range and "free only" — shared by the desktop bar and the mobile sheet. */
export function FilterControls({ filters, onChange, ageOptions, layout }: FilterControlsProps): JSX.Element {
  const { t } = useTranslation();
  const id = useId();
  const isSheet = layout === 'sheet';

  function toggleFormat(format: PlayersPerSide): void {
    const formats = filters.formats.includes(format)
      ? filters.formats.filter((f) => f !== format)
      : [...filters.formats, format];
    onChange({ ...filters, formats });
  }

  function setLevelMin(value: number): void {
    onChange({ ...filters, levelMin: value, levelMax: Math.max(value, filters.levelMax) });
  }

  function setLevelMax(value: number): void {
    onChange({ ...filters, levelMax: value, levelMin: Math.min(value, filters.levelMin) });
  }

  return (
    <div className={cn('flex gap-3', isSheet ? 'flex-col gap-5' : 'flex-wrap items-center')}>
      <div className={cn('flex flex-col gap-2', !isSheet && 'contents')}>
        {isSheet && <span className="text-sm font-bold">{t('practice.list.format')}</span>}
        <div
          role="group"
          aria-label={t('practice.list.format')}
          className={cn('gap-1 rounded-xl bg-secondary p-1', isSheet ? 'grid grid-cols-4' : 'flex')}
        >
          {PLAYERS_PER_SIDE.map((format) => {
            const active = filters.formats.includes(format);
            return (
              <button
                key={format}
                type="button"
                onClick={() => toggleFormat(format)}
                aria-pressed={active}
                className={cn(
                  'min-h-9 rounded-lg px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSheet && 'min-h-11',
                  active ? 'bg-card font-extrabold text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {formatLabel(t, format)}
              </button>
            );
          })}
        </div>
      </div>

      <label className={cn('flex gap-2 font-semibold', isSheet ? 'flex-col text-sm font-bold' : 'items-center')}>
        {t('practice.list.age')}
        <select
          value={filters.ageKey ?? ''}
          onChange={(e) => onChange({ ...filters, ageKey: e.target.value || null })}
          className={selectClass}
        >
          <option value="">{t('practice.list.allAges')}</option>
          {ageOptions.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </label>

      <div className={cn('flex gap-2', isSheet ? 'flex-col' : 'items-center')}>
        <span className={cn('font-semibold', isSheet && 'text-sm font-bold')}>{t('practice.list.level')}</span>
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-min`} className="sr-only">
            {t('practice.list.levelFrom')}
          </label>
          <select
            id={`${id}-min`}
            value={filters.levelMin}
            onChange={(e) => setLevelMin(Number(e.target.value))}
            className={cn(selectClass, isSheet && 'flex-1')}
          >
            {LEVEL_KEYS.map((_, i) => (
              <option key={i} value={i + 1}>
                {levelLabel(t, i + 1)}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">{t('practice.list.levelRangeTo')}</span>
          <label htmlFor={`${id}-max`} className="sr-only">
            {t('practice.list.levelTo')}
          </label>
          <select
            id={`${id}-max`}
            value={filters.levelMax}
            onChange={(e) => setLevelMax(Number(e.target.value))}
            className={cn(selectClass, isSheet && 'flex-1')}
          >
            {LEVEL_KEYS.map((_, i) => (
              <option key={i} value={i + 1}>
                {levelLabel(t, i + 1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <OnlyFreeToggle
        checked={filters.onlyFree}
        onChange={(onlyFree) => onChange({ ...filters, onlyFree })}
      />
    </div>
  );
}

export function OnlyFreeToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }): JSX.Element {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={cn(
        'min-h-11 shrink-0 rounded-xl border px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card text-foreground',
      )}
    >
      {t('practice.list.onlyFree')}
    </button>
  );
}

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: MatchFilters;
  onChange: (next: MatchFilters) => void;
  ageOptions: string[];
  resultCount: number;
}

/** Mobile bottom sheet holding the filter controls. */
export function FilterSheet({ open, onClose, filters, onChange, ageOptions, resultCount }: FilterSheetProps): JSX.Element | null {
  const { t } = useTranslation();
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label={t('practice.list.close')}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col gap-5 overflow-y-auto rounded-t-3xl bg-card px-5 pb-6 pt-3 text-card-foreground"
      >
        <span aria-hidden="true" className="mx-auto h-1 w-10 rounded bg-input" />
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-display text-2xl font-extrabold">
            {t('practice.list.filters')}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_FILTERS, teamQuery: filters.teamQuery, date: filters.date })}
              className="min-h-11 px-2 font-bold text-accent-foreground"
            >
              {t('practice.list.clearFilters')}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('practice.list.close')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <FilterControls filters={filters} onChange={onChange} ageOptions={ageOptions} layout="sheet" />
        <button
          type="button"
          onClick={onClose}
          className="min-h-14 rounded-2xl bg-primary text-lg font-bold text-primary-foreground"
        >
          {t('practice.list.showResults', { count: resultCount })}
        </button>
      </div>
    </div>
  );
}

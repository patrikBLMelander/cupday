import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CUP_LEVEL_LABELS } from '@/features/postedCups/postedCupFormat';
import { EMPTY_GROUP, draftTotal, groupKeys, groupTotal, type SlotDraft, type SlotGroupDraft } from '@/features/postedCups/slotDraft';
import { inputClass } from '@/features/practiceMatches/FormField';
import { cn } from '@/lib/cn';

interface SlotEditorProps {
  classes: string[];
  value: SlotDraft;
  onChange: (next: SlotDraft) => void;
  /** Level locking only applies when teams register via Din Cup. */
  allowLevelLock: boolean;
  defaultLevel: string;
  error?: string;
}

/**
 * Team slots: a single total, one count per age class, or (with "lock per level") a count per
 * class and level — e.g. P13: 4 Lätt + 4 Medel.
 */
export function SlotEditor({ classes, value, onChange, allowLevelLock, defaultLevel, error }: SlotEditorProps): JSX.Element {
  const { t } = useTranslation();
  const keys = groupKeys(classes);
  const multiClass = classes.length > 1;
  const lockLevels = allowLevelLock && value.lockLevels;
  const effective: SlotDraft = { ...value, lockLevels };

  function updateGroup(key: string, next: Partial<SlotGroupDraft>): void {
    const current = value.groups[key] ?? EMPTY_GROUP;
    onChange({ ...value, groups: { ...value.groups, [key]: { ...current, ...next } } });
  }

  return (
    <div className="flex flex-col gap-3">
      {allowLevelLock && (
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-secondary p-4">
          <span>
            <span className="block font-bold">{t('postedCup.form.lockLevels')}</span>
            <span className="text-sm text-muted-foreground">
              {multiClass ? t('postedCup.form.lockLevelsHintClasses') : t('postedCup.form.lockLevelsHint')}
            </span>
          </span>
          <input
            type="checkbox"
            checked={value.lockLevels}
            onChange={(e) => onChange({ ...value, lockLevels: e.target.checked })}
            className="h-6 w-6 shrink-0 accent-[hsl(var(--primary))]"
          />
        </label>
      )}

      {multiClass && <p className="text-sm font-semibold">{t('postedCup.form.teamsPerClass')}</p>}

      {keys.map((key) => {
        const group = value.groups[key] ?? EMPTY_GROUP;
        const label = key || t('postedCup.form.maxTeams');
        return (
          <section key={key || 'all'} aria-label={key || t('postedCup.form.maxTeams')} className={cn('flex flex-col gap-2', multiClass && 'rounded-2xl border border-border p-3')}>
            {!lockLevels ? (
              <label className={cn('flex gap-3 text-sm font-semibold', multiClass ? 'items-center justify-between' : 'flex-col gap-1.5')}>
                <span className={cn(multiClass && 'text-base font-bold')}>{label}</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  aria-label={multiClass ? t('postedCup.form.teamsInClass', { cls: key }) : undefined}
                  value={group.maxTeams}
                  onChange={(e) => updateGroup(key, { maxTeams: e.target.value })}
                  className={cn(inputClass, multiClass && 'w-28')}
                />
              </label>
            ) : (
              <>
                {multiClass && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold">{key}</span>
                    <span className="text-sm text-muted-foreground">{t('postedCup.form.classTotal', { count: groupTotal(effective, key) })}</span>
                  </div>
                )}
                <ul className="flex flex-col gap-2">
                  {group.levels.map((row, index) => (
                    <li key={row.id} className="grid grid-cols-[1fr_96px_44px] items-end gap-2">
                      <label className="flex flex-col gap-1 text-sm font-semibold">
                        {t('postedCup.form.quotaLevel')}
                        <select
                          value={row.level}
                          onChange={(e) =>
                            updateGroup(key, { levels: group.levels.map((r, i) => (i === index ? { ...r, level: e.target.value } : r)) })
                          }
                          className={inputClass}
                        >
                          {CUP_LEVEL_LABELS.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-semibold">
                        {t('postedCup.form.quotaTeams')}
                        <input
                          type="number"
                          min={1}
                          inputMode="numeric"
                          value={row.maxTeams}
                          onChange={(e) =>
                            updateGroup(key, { levels: group.levels.map((r, i) => (i === index ? { ...r, maxTeams: e.target.value } : r)) })
                          }
                          className={inputClass}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => updateGroup(key, { levels: group.levels.filter((_, i) => i !== index) })}
                        aria-label={t('postedCup.form.removeQuota')}
                        className="inline-flex h-12 w-11 items-center justify-center rounded-xl hover:bg-muted"
                      >
                        <X className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => updateGroup(key, { levels: [...group.levels, { id: crypto.randomUUID(), level: defaultLevel, maxTeams: '' }] })}
                  className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-bold text-accent-foreground"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {multiClass ? t('postedCup.form.addQuotaFor', { cls: key }) : t('postedCup.form.addQuota')}
                </button>
              </>
            )}
          </section>
        );
      })}

      {(multiClass || lockLevels) && (
        <p aria-live="polite" className="text-sm font-bold text-accent-foreground">
          {t('postedCup.form.totalTeams', { count: draftTotal(effective, classes) })}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

import type { SlotQuota } from '@/features/cups/cupTypes';

/**
 * Canonical (Swedish) level names stored for cup quotas and team levels. Stored values must not
 * depend on the viewer's language, so these are not translated.
 */
export const CUP_LEVEL_LABELS = ['Lätt−', 'Lätt', 'Lätt+', 'Medel−', 'Medel', 'Medel+', 'Svår−', 'Svår', 'Svår+'] as const;

/** "17–18 okt" / "17 okt" for a cup's date span. */
export function formatDateSpan(startDate: string, endDate: string, locale: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  if (startDate === endDate) return dayMonth.format(start);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${dayMonth.format(end)}`;
  }
  return `${dayMonth.format(start)}–${dayMonth.format(end)}`;
}

/** Number of calendar days the cup spans (inclusive). */
export function cupDayCount(startDate: string, endDate: string): number {
  const ms = new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** "09:00–17:00", or just the start, or empty. */
export function formatCupTimes(startTime?: string | null, endTime?: string | null): string {
  if (!startTime) return '';
  return endTime ? `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}` : startTime.slice(0, 5);
}

/** Slot rows grouped by age class ('' for single-class cups), in the organizer's order. */
export function quotasByClass(quotas: readonly SlotQuota[]): Array<{ ageClass: string; rows: SlotQuota[]; maxTeams: number; remaining: number }> {
  const groups: Array<{ ageClass: string; rows: SlotQuota[]; maxTeams: number; remaining: number }> = [];
  for (const quota of quotas) {
    let group = groups.find((g) => g.ageClass === quota.ageClass);
    if (!group) {
      group = { ageClass: quota.ageClass, rows: [], maxTeams: 0, remaining: 0 };
      groups.push(group);
    }
    group.rows.push(quota);
    group.maxTeams += quota.maxTeams;
    group.remaining += quota.remaining;
  }
  return groups;
}

/** Levels offered to a team in `ageClass` (rows with a level for that class, or class-less rows). */
export function levelSlotsFor(quotas: readonly SlotQuota[], ageClass: string): SlotQuota[] {
  return quotas.filter((q) => q.level !== '' && (q.ageClass === '' || q.ageClass === ageClass));
}

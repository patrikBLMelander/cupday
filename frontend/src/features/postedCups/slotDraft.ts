import type { Cup } from '@/features/cups/cupTypes';
import type { SlotRequest } from '@/features/postedCups/postedCupTypes';

/** Editable slot setup in the cup form, keyed by age class ('' when the cup has one class). */
export interface SlotGroupDraft {
  maxTeams: string;
  levels: Array<{ id: string; level: string; maxTeams: string }>;
}

export interface SlotDraft {
  lockLevels: boolean;
  groups: Record<string, SlotGroupDraft>;
}

export type SlotDraftError = 'groupCount' | 'levelRows' | 'levelCount' | 'levelDuplicate';

export const EMPTY_GROUP: SlotGroupDraft = { maxTeams: '', levels: [] };

/** One group per class when there are several, otherwise a single unnamed group. */
export function groupKeys(classes: readonly string[]): string[] {
  return classes.length > 1 ? [...classes] : [''];
}

function count(value: string): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function groupTotal(draft: SlotDraft, key: string): number {
  const group = draft.groups[key] ?? EMPTY_GROUP;
  return draft.lockLevels ? group.levels.reduce((sum, row) => sum + count(row.maxTeams), 0) : count(group.maxTeams);
}

export function draftTotal(draft: SlotDraft, classes: readonly string[]): number {
  return groupKeys(classes).reduce((sum, key) => sum + groupTotal(draft, key), 0);
}

/** First problem in the draft, or null when it can be submitted. */
export function validateDraft(draft: SlotDraft, classes: readonly string[]): SlotDraftError | null {
  for (const key of groupKeys(classes)) {
    const group = draft.groups[key] ?? EMPTY_GROUP;
    if (!draft.lockLevels) {
      if (count(group.maxTeams) === 0) return 'groupCount';
      continue;
    }
    if (group.levels.length === 0) return 'levelRows';
    if (group.levels.some((row) => count(row.maxTeams) === 0)) return 'levelCount';
    if (new Set(group.levels.map((row) => row.level)).size !== group.levels.length) return 'levelDuplicate';
  }
  return null;
}

/** API shape: total teams plus the locked slot rows (none for a single class without levels). */
export function draftToRequest(draft: SlotDraft, classes: readonly string[]): { maxTeams: number; slots: SlotRequest[] } {
  const multiClass = classes.length > 1;
  const slots: SlotRequest[] = [];
  for (const key of groupKeys(classes)) {
    const group = draft.groups[key] ?? EMPTY_GROUP;
    if (draft.lockLevels) {
      group.levels.forEach((row) => slots.push({ ageClass: key || null, level: row.level, maxTeams: count(row.maxTeams) }));
    } else if (multiClass) {
      slots.push({ ageClass: key, level: null, maxTeams: count(group.maxTeams) });
    }
  }
  return { maxTeams: draftTotal(draft, classes), slots };
}

/** Rebuilds the draft from a saved cup (edit mode). */
export function draftFromCup(cup: Cup): SlotDraft {
  const quotas = cup.slotQuotas ?? [];
  const lockLevels = quotas.some((q) => q.level !== '');
  const classes = cup.ageClasses ?? [];
  const groups: Record<string, SlotGroupDraft> = {};
  for (const key of groupKeys(classes)) {
    const rows = quotas.filter((q) => (classes.length > 1 ? q.ageClass === key : true));
    groups[key] = {
      maxTeams: lockLevels ? '' : String(classes.length > 1 ? rows[0]?.maxTeams ?? '' : cup.maxTeams),
      levels: lockLevels ? rows.map((q) => ({ id: crypto.randomUUID(), level: q.level, maxTeams: String(q.maxTeams) })) : [],
    };
  }
  return { lockLevels, groups };
}

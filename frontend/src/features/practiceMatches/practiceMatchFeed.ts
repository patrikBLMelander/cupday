import {
  MAX_LEVEL,
  MIN_LEVEL,
  type Gender,
  type PlayersPerSide,
  type PracticeMatch,
} from '@/features/practiceMatches/practiceMatchTypes';

/**
 * Items in the chronological board. Only matches today; cups will join as
 * `{ kind: 'cup' }` cards linking to the cup page.
 */
export type FeedItem = { kind: 'match'; at: string; match: PracticeMatch };

export type MatchRole = 'organizer' | 'opponent';

export interface MatchFilters {
  teamQuery: string;
  formats: PlayersPerSide[];
  ageKey: string | null;
  levelMin: number;
  levelMax: number;
  onlyFree: boolean;
  date: string | null;
}

export const DEFAULT_FILTERS: MatchFilters = {
  teamQuery: '',
  formats: [],
  ageKey: null,
  levelMin: MIN_LEVEL,
  levelMax: MAX_LEVEL,
  onlyFree: false,
  date: null,
};

export interface DayGroup {
  dateKey: string;
  items: FeedItem[];
}

/** "P13", "F12", "Mix13" — gender plus the last two digits of the birth year. */
export function ageKey(gender: Gender, birthYear: number): string {
  const prefix = gender === 'MIX' ? 'Mix' : gender;
  return `${prefix}${String(birthYear).slice(-2)}`;
}

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function contains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle);
}

/** How "my team" relates to a match: as organizer (by name or created here) or as booked opponent. */
export function matchRole(
  match: PracticeMatch,
  teamQuery: string,
  ownedIds: ReadonlySet<string>,
): MatchRole | null {
  if (ownedIds.has(match.id)) return 'organizer';
  const query = teamQuery.trim().toLowerCase();
  if (!query) return null;
  if (contains(match.teamName, query)) return 'organizer';
  if (match.bookedTeams.some((team) => contains(team, query))) return 'opponent';
  return null;
}

/** Applies every filter except the date (the date strip counts per day on this result). */
export function filterMatches(
  matches: readonly PracticeMatch[],
  filters: MatchFilters,
  ownedIds: ReadonlySet<string>,
): PracticeMatch[] {
  const hasTeamQuery = filters.teamQuery.trim().length > 0;
  return matches.filter((match) => {
    if (hasTeamQuery && matchRole(match, filters.teamQuery, ownedIds) === null) return false;
    if (filters.formats.length > 0 && !filters.formats.includes(match.playersPerSide)) return false;
    if (filters.ageKey && ageKey(match.gender, match.birthYear) !== filters.ageKey) return false;
    if (match.level < filters.levelMin || match.level > filters.levelMax) return false;
    if (filters.onlyFree && match.freeSlots === 0) return false;
    return true;
  });
}

/** Sorted, de-duplicated age keys present in the data — options for the age filter. */
export function availableAgeKeys(matches: readonly PracticeMatch[]): string[] {
  const keys = new Set(matches.map((m) => ageKey(m.gender, m.birthYear)));
  return [...keys].sort((a, b) => a.localeCompare(b, 'sv'));
}

export function toFeedItems(matches: readonly PracticeMatch[]): FeedItem[] {
  return matches
    .map((match): FeedItem => ({ kind: 'match', at: match.kickoffAt, match }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** Groups feed items by local day, keeping chronological order. */
export function groupByDay(items: readonly FeedItem[], date: string | null = null): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const dateKey = localDateKey(item.at);
    if (date && dateKey !== date) continue;
    const last = groups.at(-1);
    if (last?.dateKey === dateKey) {
      last.items.push(item);
    } else {
      groups.push({ dateKey, items: [item] });
    }
  }
  return groups;
}

/** The soonest match that still has a free slot. */
export function nextBookableId(items: readonly FeedItem[]): string | null {
  const next = items.find((item) => item.match.freeSlots > 0);
  return next?.match.id ?? null;
}

export function countByDay(items: readonly FeedItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = localDateKey(item.at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export const WINDOW_DAYS = 14;
export const WINDOW_STEP_DAYS = 7;

/** Local midnight of the given day. */
export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function addDays(value: Date, days: number): Date {
  const d = startOfDay(value);
  d.setDate(d.getDate() + days);
  return d;
}

/** `count` consecutive days starting at `start`, for the date strip. */
export function upcomingDays(start: Date, count = WINDOW_DAYS): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** API time range for a strip window: local midnight of the first day up to midnight after the last. */
export function windowRange(start: Date, days = WINDOW_DAYS): { from: string; to: string } {
  return { from: startOfDay(start).toISOString(), to: addDays(start, days).toISOString() };
}

/** Number of filters that narrow the list (team search and date excluded) — shown on the mobile filter button. */
export function activeFilterCount(filters: MatchFilters): number {
  let count = 0;
  if (filters.formats.length > 0) count += 1;
  if (filters.ageKey) count += 1;
  if (filters.levelMin !== MIN_LEVEL || filters.levelMax !== MAX_LEVEL) count += 1;
  if (filters.onlyFree) count += 1;
  return count;
}

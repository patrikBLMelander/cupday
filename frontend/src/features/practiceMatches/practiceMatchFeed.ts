import type { Cup } from '@/features/cups/cupTypes';
import {
  MAX_LEVEL,
  MIN_LEVEL,
  type Gender,
  type PlayersPerSide,
  type PracticeMatch,
} from '@/features/practiceMatches/practiceMatchTypes';

/**
 * Items in the chronological board: practice matches, cups on their first day, and a slim
 * "day 2 of 3" row on the following days of multi-day cups.
 */
export type FeedItem =
  | { kind: 'match'; at: string; match: PracticeMatch }
  | { kind: 'cup'; at: string; cup: Cup }
  | { kind: 'cupDay'; at: string; cup: Cup; day: number; days: number };

export type FeedKind = 'all' | 'matches' | 'cups';

export type MatchRole = 'organizer' | 'opponent';

export interface MatchFilters {
  teamQuery: string;
  formats: PlayersPerSide[];
  ageKey: string | null;
  levelMin: number;
  levelMax: number;
  onlyFree: boolean;
  date: string | null;
  show: FeedKind;
}

export const DEFAULT_FILTERS: MatchFilters = {
  teamQuery: '',
  formats: [],
  ageKey: null,
  levelMin: MIN_LEVEL,
  levelMax: MAX_LEVEL,
  onlyFree: false,
  date: null,
  show: 'all',
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
    // Overlap: a "Lätt+ till Medel" match shows up when searching for Medel to Svår.
    if (match.levelMax < filters.levelMin || match.levelMin > filters.levelMax) return false;
    if (filters.onlyFree && match.freeSlots === 0) return false;
    return true;
  });
}

/** Sorted, de-duplicated age keys present in the data — options for the age filter. */
export function availableAgeKeys(matches: readonly PracticeMatch[]): string[] {
  const keys = new Set(matches.map((m) => ageKey(m.gender, m.birthYear)));
  return [...keys].sort((a, b) => a.localeCompare(b, 'sv'));
}

/** Cups that pass the same filters as matches. With a team search only cups posted here are kept. */
export function filterCups(cups: readonly Cup[], filters: MatchFilters, ownedCupIds: ReadonlySet<string>): Cup[] {
  if (filters.show === 'matches') return [];
  return cups.filter((cup) => {
    if (cup.status === 'draft') return false;
    if (filters.teamQuery.trim() && !ownedCupIds.has(cup.id)) return false;
    if (filters.formats.length > 0 && !filters.formats.includes(cup.playersPerTeam as PlayersPerSide)) return false;
    if (filters.ageKey && !(cup.ageClasses ?? []).includes(filters.ageKey)) return false;
    if (cup.levelMin != null && cup.levelMax != null) {
      if (cup.levelMax < filters.levelMin || cup.levelMin > filters.levelMax) return false;
    } else if (filters.levelMin !== MIN_LEVEL || filters.levelMax !== MAX_LEVEL) {
      return false;
    }
    if (filters.onlyFree && (cup.status !== 'open' || cup.activeTeamCount >= cup.maxTeams)) return false;
    return true;
  });
}

/** Local ISO-like timestamp (no zone) so `new Date()` reads it as local time. */
function localStamp(date: string, time?: string | null): string {
  return `${date}T${time ?? '00:00:00'}`;
}

/** Feed items for cups: the full card on the first day, continuation rows on later days. */
function cupItems(cup: Cup): FeedItem[] {
  const items: FeedItem[] = [];
  const start = new Date(`${cup.startDate}T00:00:00`);
  const end = new Date(`${cup.endDate}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  items.push({ kind: 'cup', at: localStamp(cup.startDate, cup.startTime), cup });
  for (let day = 2; day <= days; day += 1) {
    const date = localDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + day - 1));
    items.push({ kind: 'cupDay', at: localStamp(date), cup, day, days });
  }
  return items;
}

/** All matches and cups as one chronological feed, limited to [windowFrom, windowTo). */
export function toFeedItems(
  matches: readonly PracticeMatch[],
  cups: readonly Cup[] = [],
  window?: { from: Date; to: Date },
): FeedItem[] {
  const inWindow = (item: FeedItem): boolean => {
    if (!window || item.kind === 'match') return true;
    const at = new Date(item.at).getTime();
    return at >= window.from.getTime() && at < window.to.getTime();
  };
  return [
    ...matches.map((match): FeedItem => ({ kind: 'match', at: match.kickoffAt, match })),
    ...cups.flatMap(cupItems),
  ]
    .filter(inWindow)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
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
  for (const item of items) {
    if (item.kind === 'match' && item.match.freeSlots > 0) return item.match.id;
  }
  return null;
}

/** Matches and cup starts per day (continuation rows are not counted). */
export function countByDay(items: readonly FeedItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.kind === 'cupDay') continue;
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

/** Days on which a cup is played — marked with a trophy in the date strip. */
export function cupDays(items: readonly FeedItem[]): Set<string> {
  return new Set(items.filter((item) => item.kind !== 'match').map((item) => localDateKey(item.at)));
}

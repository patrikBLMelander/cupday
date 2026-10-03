import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FILTERS,
  ageKey,
  filterMatches,
  groupByDay,
  matchRole,
  nextBookableId,
  toFeedItems,
} from '@/features/practiceMatches/practiceMatchFeed';
import { buildMatch, inDays } from '@/features/practiceMatches/testFixtures';

const none = new Set<string>();

describe('practiceMatchFeed', () => {
  it('formats age keys from gender and birth year', () => {
    expect(ageKey('P', 2013)).toBe('P13');
    expect(ageKey('MIX', 2015)).toBe('Mix15');
  });

  it('filters by level range, format and free slots', () => {
    const easy = buildMatch({ level: 2, playersPerSide: 5 });
    const hard = buildMatch({ level: 8, playersPerSide: 7 });
    const full = buildMatch({ level: 4, playersPerSide: 7, freeSlots: 0 });
    const all = [easy, hard, full];

    expect(filterMatches(all, { ...DEFAULT_FILTERS, levelMin: 1, levelMax: 6 }, none)).toEqual([easy, full]);
    expect(filterMatches(all, { ...DEFAULT_FILTERS, formats: [7] }, none)).toEqual([hard, full]);
    expect(filterMatches(all, { ...DEFAULT_FILTERS, onlyFree: true }, none)).toEqual([easy, hard]);
  });

  it('matches "my team" as organizer or as booked opponent', () => {
    const organizing = buildMatch({ teamName: 'Ekens IF F11' });
    const opponent = buildMatch({ teamName: 'Solna BK', bookedTeams: ['Ekens IF F11'] });
    const other = buildMatch({ teamName: 'Hässelby SK' });

    const result = filterMatches([organizing, opponent, other], { ...DEFAULT_FILTERS, teamQuery: 'ekens' }, none);

    expect(result).toEqual([organizing, opponent]);
    expect(matchRole(organizing, 'ekens', none)).toBe('organizer');
    expect(matchRole(opponent, 'ekens', none)).toBe('opponent');
    expect(matchRole(other, '', new Set([other.id]))).toBe('organizer');
  });

  it('groups chronologically by day and picks the next bookable match', () => {
    const later = buildMatch({ kickoffAt: inDays(2, 9) });
    const fullToday = buildMatch({ kickoffAt: inDays(0, 23), freeSlots: 0 });
    const tomorrow = buildMatch({ kickoffAt: inDays(1, 18) });
    const items = toFeedItems([later, fullToday, tomorrow]);

    const groups = groupByDay(items);

    expect(groups.map((g) => g.items.map((i) => i.match.id))).toEqual([[fullToday.id], [tomorrow.id], [later.id]]);
    expect(nextBookableId(items)).toBe(tomorrow.id);
  });
});

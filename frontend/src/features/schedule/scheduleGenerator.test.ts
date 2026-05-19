import { describe, expect, it } from 'vitest';

import { generateSchedule } from '@/features/schedule/scheduleGenerator';
import type { TeamRef } from '@/features/schedule/scheduleTypes';
import type { GroupLabel } from '@/features/teams/teamTypes';

function teams(prefix: string, count: number): TeamRef[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i + 1}` }));
}

function buildMap(
  entries: ReadonlyArray<[GroupLabel, TeamRef[]]>,
): ReadonlyMap<GroupLabel, readonly TeamRef[]> {
  return new Map<GroupLabel, readonly TeamRef[]>(entries);
}

const START = new Date('2026-06-01T10:00:00.000Z');

describe('generateSchedule', () => {
  it('2×4: produces 12 matches with each team playing 3, every pair once, 6 slots alternating A/B on 2 pitches', () => {
    const groups = buildMap([
      ['A', teams('a', 4)],
      ['B', teams('b', 4)],
    ]);
    const matches = generateSchedule({
      cupId: 'cup-1',
      teamsByGroup: groups,
      startTime: START,
      matchDurationMinutes: 15,
      breakBetweenMatchesMinutes: 5,
    });

    expect(matches).toHaveLength(12);
    assertEachTeamPlays(matches, groups, 3);
    assertEachPairPlaysOnceWithinGroup(matches, groups);
    assertGroupsAlternateBySlot(matches, ['A', 'B']);
    assertPitchesContiguous(matches, 2);
    assertSlotSpacing(matches, 15, 5);
  });

  it('3×4: produces 18 matches across 9 slots cycling A→B→C', () => {
    const groups = buildMap([
      ['A', teams('a', 4)],
      ['B', teams('b', 4)],
      ['C', teams('c', 4)],
    ]);
    const matches = generateSchedule({
      cupId: 'cup-1',
      teamsByGroup: groups,
      startTime: START,
      matchDurationMinutes: 15,
      breakBetweenMatchesMinutes: 5,
    });

    expect(matches).toHaveLength(18);
    assertEachTeamPlays(matches, groups, 3);
    assertEachPairPlaysOnceWithinGroup(matches, groups);
    assertGroupsAlternateBySlot(matches, ['A', 'B', 'C']);
    assertPitchesContiguous(matches, 2);
  });

  it('2×5: produces 20 matches with each team playing 4 (one bye per round)', () => {
    const groups = buildMap([
      ['A', teams('a', 5)],
      ['B', teams('b', 5)],
    ]);
    const matches = generateSchedule({
      cupId: 'cup-1',
      teamsByGroup: groups,
      startTime: START,
      matchDurationMinutes: 15,
      breakBetweenMatchesMinutes: 5,
    });

    expect(matches).toHaveLength(20);
    assertEachTeamPlays(matches, groups, 4);
    assertEachPairPlaysOnceWithinGroup(matches, groups);
    assertGroupsAlternateBySlot(matches, ['A', 'B']);
    assertPitchesContiguous(matches, 2);
  });

  it('throws when groups have different sizes', () => {
    expect(() =>
      generateSchedule({
        cupId: 'cup-1',
        teamsByGroup: buildMap([
          ['A', teams('a', 4)],
          ['B', teams('b', 3)],
        ]),
        startTime: START,
        matchDurationMinutes: 15,
        breakBetweenMatchesMinutes: 5,
      }),
    ).toThrow(/same number of teams/);
  });

  it('throws when a group has fewer than 2 teams', () => {
    expect(() =>
      generateSchedule({
        cupId: 'cup-1',
        teamsByGroup: buildMap([
          ['A', teams('a', 1)],
          ['B', teams('b', 1)],
        ]),
        startTime: START,
        matchDurationMinutes: 15,
        breakBetweenMatchesMinutes: 5,
      }),
    ).toThrow(/at least/);
  });

  it('throws when no groups are provided', () => {
    expect(() =>
      generateSchedule({
        cupId: 'cup-1',
        teamsByGroup: buildMap([]),
        startTime: START,
        matchDurationMinutes: 15,
        breakBetweenMatchesMinutes: 5,
      }),
    ).toThrow(/At least one group/);
  });
});

// Helpers -----------------------------------------------------------------

function assertEachTeamPlays(
  matches: ReadonlyArray<Omit<{
    homeTeamId: string;
    awayTeamId: string;
  }, 'never'>>,
  groups: ReadonlyMap<GroupLabel, readonly TeamRef[]>,
  expected: number,
): void {
  const ids = new Set<string>();
  groups.forEach((list) => list.forEach((t) => ids.add(t.id)));
  for (const id of ids) {
    const count = matches.filter(
      (m) => m.homeTeamId === id || m.awayTeamId === id,
    ).length;
    expect(count, `team ${id} plays ${expected}`).toBe(expected);
  }
}

function assertEachPairPlaysOnceWithinGroup(
  matches: ReadonlyArray<{
    groupLabel: GroupLabel;
    homeTeamId: string;
    awayTeamId: string;
  }>,
  groups: ReadonlyMap<GroupLabel, readonly TeamRef[]>,
): void {
  groups.forEach((list, label) => {
    const groupMatches = matches.filter((m) => m.groupLabel === label);
    const expectedPairs = (list.length * (list.length - 1)) / 2;
    expect(groupMatches).toHaveLength(expectedPairs);
    const seen = new Set<string>();
    for (const m of groupMatches) {
      const key = [m.homeTeamId, m.awayTeamId].sort().join('|');
      expect(seen.has(key), `pair ${key} plays only once`).toBe(false);
      seen.add(key);
    }
  });
}

function assertGroupsAlternateBySlot(
  matches: ReadonlyArray<{ startTime: string; groupLabel: GroupLabel }>,
  expectedOrder: GroupLabel[],
): void {
  const slotKeys = [...new Set(matches.map((m) => m.startTime))].sort();
  slotKeys.forEach((slot, idx) => {
    const slotMatches = matches.filter((m) => m.startTime === slot);
    const expected = expectedOrder[idx % expectedOrder.length];
    expect(slotMatches.every((m) => m.groupLabel === expected)).toBe(true);
  });
}

function assertPitchesContiguous(
  matches: ReadonlyArray<{ startTime: string; pitch: number }>,
  expectedMaxPitch: number,
): void {
  const slotKeys = [...new Set(matches.map((m) => m.startTime))];
  for (const slot of slotKeys) {
    const pitches = matches
      .filter((m) => m.startTime === slot)
      .map((m) => m.pitch)
      .sort((a, b) => a - b);
    pitches.forEach((pitch, i) => {
      expect(pitch).toBe(i + 1);
    });
    expect(pitches.length).toBeLessThanOrEqual(expectedMaxPitch);
  }
}

function assertSlotSpacing(
  matches: ReadonlyArray<{ startTime: string }>,
  durationMin: number,
  breakMin: number,
): void {
  const slotKeys = [...new Set(matches.map((m) => m.startTime))].sort();
  const expectedMs = (durationMin + breakMin) * 60_000;
  for (let i = 1; i < slotKeys.length; i++) {
    const diff =
      new Date(slotKeys[i]).getTime() -
      new Date(slotKeys[i - 1]).getTime();
    expect(diff).toBe(expectedMs);
  }
}

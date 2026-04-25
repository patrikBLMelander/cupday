import { describe, expect, it } from 'vitest';

import { generateSchedule } from '@/features/schedule/scheduleGenerator';
import type { ScheduleGeneratorInput } from '@/features/schedule/scheduleTypes';

const groupA = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }, { id: 'a4' }];
const groupB = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }, { id: 'b4' }];

const baseInput: ScheduleGeneratorInput = {
  cupId: 'cup-1',
  groupATeams: groupA,
  groupBTeams: groupB,
  startTime: new Date('2026-06-01T10:00:00.000Z'),
  matchDurationMinutes: 15,
  breakBetweenMatchesMinutes: 5,
};

describe('generateSchedule', () => {
  it('produces 12 matches with the expected round-robin pairings', () => {
    const matches = generateSchedule(baseInput);
    expect(matches).toHaveLength(12);

    // Slot 0 → Group A round 1: pitch 1 = (a1, a2), pitch 2 = (a3, a4)
    expect(matches[0]).toMatchObject({
      groupLabel: 'A',
      pitch: 1,
      homeTeamId: 'a1',
      awayTeamId: 'a2',
    });
    expect(matches[1]).toMatchObject({
      groupLabel: 'A',
      pitch: 2,
      homeTeamId: 'a3',
      awayTeamId: 'a4',
    });

    // Slot 1 → Group B round 1
    expect(matches[2]).toMatchObject({
      groupLabel: 'B',
      pitch: 1,
      homeTeamId: 'b1',
      awayTeamId: 'b2',
    });

    // Slot 4 → Group A round 3: pitch 1 = (a1, a4), pitch 2 = (a2, a3)
    expect(matches[8]).toMatchObject({
      groupLabel: 'A',
      pitch: 1,
      homeTeamId: 'a1',
      awayTeamId: 'a4',
    });
    expect(matches[9]).toMatchObject({
      groupLabel: 'A',
      pitch: 2,
      homeTeamId: 'a2',
      awayTeamId: 'a3',
    });
  });

  it('schedules every team to play exactly three times', () => {
    const matches = generateSchedule(baseInput);
    const allIds = [...groupA, ...groupB].map((t) => t.id);
    for (const id of allIds) {
      const count = matches.filter(
        (m) => m.homeTeamId === id || m.awayTeamId === id,
      ).length;
      expect(count).toBe(3);
    }
  });

  it('keeps Group A in even slots and Group B in odd slots', () => {
    const matches = generateSchedule(baseInput);
    const slotKeys = [...new Set(matches.map((m) => m.startTime))].sort();
    expect(slotKeys).toHaveLength(6);
    slotKeys.forEach((slot, idx) => {
      const slotMatches = matches.filter((m) => m.startTime === slot);
      const expected = idx % 2 === 0 ? 'A' : 'B';
      expect(slotMatches.every((m) => m.groupLabel === expected)).toBe(true);
    });
  });

  it('spaces slot timestamps by (matchDuration + break) minutes', () => {
    const matches = generateSchedule(baseInput);
    const slotKeys = [...new Set(matches.map((m) => m.startTime))].sort();
    const expectedSpacingMs =
      (baseInput.matchDurationMinutes +
        baseInput.breakBetweenMatchesMinutes) *
      60_000;
    for (let i = 1; i < slotKeys.length; i++) {
      const prev = new Date(slotKeys[i - 1]).getTime();
      const curr = new Date(slotKeys[i]).getTime();
      expect(curr - prev).toBe(expectedSpacingMs);
    }
  });

  it('throws when a group does not have exactly 4 teams', () => {
    expect(() =>
      generateSchedule({ ...baseInput, groupATeams: groupA.slice(0, 3) }),
    ).toThrow();
  });
});

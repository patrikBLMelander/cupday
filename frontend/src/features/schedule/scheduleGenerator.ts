import type { Match, ScheduleGeneratorInput } from '@/features/schedule/scheduleTypes';

// Round-robin pairings for 4 teams. Each round has two matches; the inner
// tuples are 0-based indices into the group's team array.
const ROUND_PAIRINGS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
];

const TEAMS_PER_GROUP = 4;
const ROUNDS = 3;
const SLOTS = 6;

/**
 * Deterministic round-robin schedule for two groups of four teams across two
 * pitches. Even slots run a Group A round (both matches in parallel on
 * pitches 1 and 2); odd slots run a Group B round. Every team plays exactly
 * three matches with a one-slot rest between matches.
 */
export function generateSchedule(
  input: ScheduleGeneratorInput,
): Omit<Match, 'id'>[] {
  if (
    input.groupATeams.length !== TEAMS_PER_GROUP ||
    input.groupBTeams.length !== TEAMS_PER_GROUP
  ) {
    throw new Error('Each group must have exactly 4 teams');
  }
  if (input.matchDurationMinutes <= 0 || input.breakBetweenMatchesMinutes < 0) {
    throw new Error('Match duration must be positive and break must be non-negative');
  }

  const slotMs =
    (input.matchDurationMinutes + input.breakBetweenMatchesMinutes) * 60_000;
  const baseMs = input.startTime.getTime();
  const matches: Omit<Match, 'id'>[] = [];

  for (let slot = 0; slot < SLOTS; slot++) {
    const isGroupA = slot % 2 === 0;
    const round = Math.floor(slot / 2);
    if (round >= ROUNDS) break;
    const teams = isGroupA ? input.groupATeams : input.groupBTeams;
    const groupLabel = isGroupA ? 'A' : 'B';
    const slotStart = new Date(baseMs + slot * slotMs).toISOString();

    const pairings = ROUND_PAIRINGS[round];
    pairings.forEach(([homeIdx, awayIdx], matchIndex) => {
      matches.push({
        cupId: input.cupId,
        groupLabel,
        pitch: matchIndex === 0 ? 1 : 2,
        startTime: slotStart,
        homeTeamId: teams[homeIdx].id,
        awayTeamId: teams[awayIdx].id,
      });
    });
  }

  return matches;
}

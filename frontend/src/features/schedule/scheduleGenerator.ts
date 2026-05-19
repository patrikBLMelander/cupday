import type { Match, ScheduleGeneratorInput, TeamRef } from '@/features/schedule/scheduleTypes';
import type { GroupLabel } from '@/features/teams/teamTypes';

const MIN_TEAMS_PER_GROUP = 2;

/**
 * Parametric round-robin schedule generator for N groups × M teams. Each
 * group runs the circle-method round-robin (M-1 rounds for even M, M rounds
 * for odd M with a bye per round). Group rounds are interleaved: slot
 * {@code s} runs group {@code s % N}'s round {@code Math.floor(s / N)}, with
 * matches assigned sequentially to pitches 1..K within the slot.
 *
 * Mirrors {@code backend/src/main/java/com/cup/backend/schedule/ScheduleGenerator.java}.
 */
export function generateSchedule(
  input: ScheduleGeneratorInput,
): Omit<Match, 'id'>[] {
  const groups = orderedGroupEntries(input.teamsByGroup);
  if (groups.length === 0) {
    throw new Error('At least one group is required');
  }
  const teamsPerGroup = groups[0][1].length;
  if (teamsPerGroup < MIN_TEAMS_PER_GROUP) {
    throw new Error(`Each group must have at least ${MIN_TEAMS_PER_GROUP} teams`);
  }
  for (const [label, teams] of groups) {
    if (teams.length !== teamsPerGroup) {
      throw new Error(
        `All groups must have the same number of teams (group ${label} has ${teams.length}, expected ${teamsPerGroup})`,
      );
    }
  }
  if (input.matchDurationMinutes <= 0 || input.breakBetweenMatchesMinutes < 0) {
    throw new Error('Match duration must be positive and break must be non-negative');
  }

  const roundsPerGroup = roundRobin(teamsPerGroup);
  const slotMs =
    (input.matchDurationMinutes + input.breakBetweenMatchesMinutes) * 60_000;
  const baseMs = input.startTime.getTime();
  const matches: Omit<Match, 'id'>[] = [];

  for (let round = 0; round < roundsPerGroup.length; round++) {
    const pairings = roundsPerGroup[round];
    for (let g = 0; g < groups.length; g++) {
      const slot = round * groups.length + g;
      const slotStart = new Date(baseMs + slot * slotMs).toISOString();
      const [label, teams] = groups[g];
      pairings.forEach(([homeIdx, awayIdx], m) => {
        matches.push({
          cupId: input.cupId,
          groupLabel: label,
          pitch: m + 1,
          startTime: slotStart,
          homeTeamId: teams[homeIdx].id,
          awayTeamId: teams[awayIdx].id,
        });
      });
    }
  }

  return matches;
}

/** Circle-method round-robin: returns one inner array per round with real-team-index pairs. */
function roundRobin(m: number): ReadonlyArray<ReadonlyArray<readonly [number, number]>> {
  const size = m % 2 === 0 ? m : m + 1;
  const byeIndex = m;
  const positions = Array.from({ length: size }, (_, i) => i);
  const rounds: Array<Array<readonly [number, number]>> = [];
  for (let r = 0; r < size - 1; r++) {
    const round: Array<readonly [number, number]> = [];
    for (let i = 0; i < size / 2; i++) {
      const a = positions[i];
      const b = positions[size - 1 - i];
      if (a !== byeIndex && b !== byeIndex) {
        round.push([a, b]);
      }
    }
    rounds.push(round);
    rotate(positions);
  }
  return rounds;
}

/** Standard circle rotation: index 0 stays fixed, others rotate clockwise. */
function rotate(positions: number[]): void {
  if (positions.length <= 2) return;
  const last = positions[positions.length - 1];
  for (let i = positions.length - 1; i > 1; i--) {
    positions[i] = positions[i - 1];
  }
  positions[1] = last;
}

function orderedGroupEntries(
  teamsByGroup: ReadonlyMap<GroupLabel, readonly TeamRef[]>,
): Array<[GroupLabel, readonly TeamRef[]]> {
  const order: GroupLabel[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const entries: Array<[GroupLabel, readonly TeamRef[]]> = [];
  for (const label of order) {
    const teams = teamsByGroup.get(label);
    if (teams !== undefined) {
      entries.push([label, teams]);
    }
  }
  return entries;
}

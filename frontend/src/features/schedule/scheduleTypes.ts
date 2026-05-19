import type { GroupLabel } from '@/features/teams/teamTypes';

/** Pitch number, 1-based. Numeric (not a literal union) so configurations with more than 2 pitches type-check. */
export type Pitch = number;

export type Match = {
  id: string;
  cupId: string;
  groupLabel: GroupLabel;
  pitch: Pitch;
  startTime: string; // ISO datetime
  homeTeamId: string;
  awayTeamId: string;
};

/** What the pure generator needs from a team. */
export type TeamRef = { id: string };

export type ScheduleGeneratorInput = {
  cupId: string;
  /** Teams per group, keyed by group label. Generator iterates in A..H order. */
  teamsByGroup: ReadonlyMap<GroupLabel, readonly TeamRef[]>;
  startTime: Date;
  matchDurationMinutes: number;
  breakBetweenMatchesMinutes: number;
};

/** Server-side payload to generate a schedule. */
export type ScheduleSettingsRequest = {
  startTime: string; // ISO datetime
  matchDurationMinutes: number;
  breakBetweenMatchesMinutes: number;
};

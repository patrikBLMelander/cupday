import type { GroupLabel } from '@/features/teams/teamTypes';

export type Pitch = 1 | 2;

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
  groupATeams: readonly TeamRef[];
  groupBTeams: readonly TeamRef[];
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

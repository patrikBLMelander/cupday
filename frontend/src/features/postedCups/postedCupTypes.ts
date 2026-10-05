import type { Cup, PlayersPerTeam } from '@/features/cups/cupTypes';
import type { Team, TeamStatus } from '@/features/teams/teamTypes';

/** Slot row: '' (or null) for class/level means "not locked on that dimension". */
export interface SlotRequest {
  ageClass: string | null;
  level: string | null;
  maxTeams: number;
}

/** Body for posting/editing a cup without an account. */
export interface PostedCupRequest {
  name: string;
  organizingClubName: string;
  clubLogoUrl: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  ageClasses: string[];
  playersPerTeam: PlayersPerTeam;
  levelMin: number;
  levelMax: number;
  maxTeams: number;
  registrationFeeSek: number;
  registrationDeadline: string | null;
  externalRegistrationUrl: string | null;
  paymentLink: string | null;
  paymentInstructions: string | null;
  slots: SlotRequest[];
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  description: string | null;
  hasToilets: boolean;
  hasFood: boolean;
  hasParking: boolean;
  mapUrl: string | null;
  acceptTerms: boolean;
  /** Honeypot — always empty for humans. */
  website?: string;
}

export interface CreatePostedCupResponse {
  cup: Cup;
  manageToken: string;
  /** The admin link is also on its way by email. */
  confirmationEmail?: boolean;
}

export interface ManagedCup {
  cup: Cup;
  teams: Team[];
}

export interface ManageCupArgs {
  id: string;
  token: string;
}

export type SettableTeamStatus = Extract<TeamStatus, 'reserved' | 'paid' | 'cancelled'>;

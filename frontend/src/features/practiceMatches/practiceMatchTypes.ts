export type Gender = 'P' | 'F' | 'MIX';
export type PlayersPerSide = 5 | 7 | 9 | 11;
export type PracticeMatchStatus = 'active' | 'cancelled';
export type BookingStatus = 'booked' | 'cancelled';

export const GENDERS: readonly Gender[] = ['P', 'F', 'MIX'];
export const PLAYERS_PER_SIDE: readonly PlayersPerSide[] = [5, 7, 9, 11];
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 9;
/** Level 1..9 → i18n key suffix (Lätt− … Svår+). */
export const LEVEL_KEYS = [
  'easyMinus',
  'easy',
  'easyPlus',
  'mediumMinus',
  'medium',
  'mediumPlus',
  'hardMinus',
  'hard',
  'hardPlus',
] as const;
export const MAX_OPPONENT_SLOTS = 5;

export interface PracticeMatch {
  id: string;
  teamName: string;
  gender: Gender;
  birthYear: number;
  level: number;
  playersPerSide: PlayersPerSide;
  kickoffAt: string;
  venue: string;
  opponentSlots: number;
  freeSlots: number;
  bookedTeams: string[];
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  costSek: number | null;
  notes: string | null;
  status: PracticeMatchStatus;
  createdAt: string;
}

export interface PracticeMatchRequest {
  teamName: string;
  gender: Gender;
  birthYear: number;
  level: number;
  playersPerSide: PlayersPerSide;
  kickoffAt: string;
  venue: string;
  opponentSlots: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  costSek: number | null;
  notes: string | null;
  /** Honeypot — always empty for humans. */
  website?: string;
}

export interface BookingRequest {
  teamName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  message: string | null;
  /** Honeypot — always empty for humans. */
  website?: string;
}

export interface Booking {
  id: string;
  matchId: string;
  teamName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  message: string | null;
  status: BookingStatus;
  createdAt: string;
  cancelledAt: string | null;
}

export interface CreatePracticeMatchResponse {
  match: PracticeMatch;
  manageToken: string;
}

export interface CreateBookingResponse {
  booking: Booking;
  manageToken: string;
}

export interface ManagedPracticeMatch {
  match: PracticeMatch;
  bookings: Booking[];
}

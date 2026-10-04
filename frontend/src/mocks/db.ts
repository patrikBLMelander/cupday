const STORAGE_KEY = 'cup.mock.db.v3';

import type { Cup } from '@/features/cups/cupTypes';
import type { Booking, PracticeMatch } from '@/features/practiceMatches/practiceMatchTypes';
import type { Match } from '@/features/schedule/scheduleTypes';
import type { Registration, Team } from '@/features/teams/teamTypes';

export type MockUser = { id: string; email: string };

/** Mock rows keep the raw manage token (the real backend stores only a hash). */
export type MockPracticeMatch = PracticeMatch & { manageToken: string };
export type MockBooking = Booking & { manageToken: string };

export type MockDB = {
  users: MockUser[];
  cups: Cup[];
  teams: Team[];
  registrations: Registration[];
  matches: Match[];
  practiceMatches: MockPracticeMatch[];
  practiceBookings: MockBooking[];
  /** cupId → raw manage token for cups posted without an account. */
  postedCupTokens: Record<string, string>;
  sessions: Array<{ token: string; userId: string }>;
};

const emptyDB: MockDB = {
  users: [],
  cups: [],
  teams: [],
  registrations: [],
  matches: [],
  practiceMatches: [],
  practiceBookings: [],
  postedCupTokens: {},
  sessions: [],
};

function load(): MockDB {
  if (typeof window === 'undefined') return structuredClone(emptyDB);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(emptyDB);
  try {
    // Merge so data saved before new collections existed still loads.
    return { ...structuredClone(emptyDB), ...(JSON.parse(raw) as Partial<MockDB>) };
  } catch {
    return structuredClone(emptyDB);
  }
}

function save(state: MockDB): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state: MockDB = load();

export const db = {
  read: (): MockDB => state,
  write: (updater: (draft: MockDB) => void): void => {
    const next = structuredClone(state);
    updater(next);
    state = next;
    save(state);
  },
  reset: (): void => {
    state = structuredClone(emptyDB);
    save(state);
  },
};

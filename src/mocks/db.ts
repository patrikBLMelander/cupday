const STORAGE_KEY = 'cup.mock.db.v1';

import type { Cup } from '@/features/cups/cupTypes';
import type { Registration, Team } from '@/features/teams/teamTypes';

export type MockUser = { id: string; email: string };

export type MockDB = {
  users: MockUser[];
  cups: Cup[];
  teams: Team[];
  registrations: Registration[];
  matches: unknown[];
  sessions: Array<{ token: string; userId: string }>;
};

const emptyDB: MockDB = {
  users: [],
  cups: [],
  teams: [],
  registrations: [],
  matches: [],
  sessions: [],
};

function load(): MockDB {
  if (typeof window === 'undefined') return structuredClone(emptyDB);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(emptyDB);
  try {
    return JSON.parse(raw) as MockDB;
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

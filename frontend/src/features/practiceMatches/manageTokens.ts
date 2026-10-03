/**
 * Browser-local memory of the secret manage tokens returned when posting or
 * booking. They replace accounts; losing them only loses the convenience
 * shortcut — the manage link still works.
 */
const STORAGE_KEY = 'cup.practiceMatches.tokens.v1';
const TEAM_QUERY_KEY = 'cup.practiceMatches.teamQuery';

export interface StoredBooking {
  bookingId: string;
  matchId: string;
  token: string;
  teamName: string;
}

interface TokenStore {
  matches: Record<string, string>;
  bookings: Record<string, StoredBooking>;
}

function read(): TokenStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TokenStore;
  } catch {
    // Storage blocked or corrupt — fall through to empty.
  }
  return { matches: {}, bookings: {} };
}

function write(update: (store: TokenStore) => void): void {
  const store = read();
  update(store);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage blocked — tokens live only in the manage link then.
  }
}

export function getMatchToken(matchId: string): string | null {
  return read().matches[matchId] ?? null;
}

export function saveMatchToken(matchId: string, token: string): void {
  write((store) => {
    store.matches[matchId] = token;
  });
}

export function ownedMatchIds(): Set<string> {
  return new Set(Object.keys(read().matches));
}

export function saveBooking(booking: StoredBooking): void {
  write((store) => {
    store.bookings[booking.bookingId] = booking;
  });
}

export function bookingsForMatch(matchId: string): StoredBooking[] {
  return Object.values(read().bookings).filter((b) => b.matchId === matchId);
}

export function removeBooking(bookingId: string): void {
  write((store) => {
    delete store.bookings[bookingId];
  });
}

export function readTeamQuery(): string {
  try {
    return window.localStorage.getItem(TEAM_QUERY_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveTeamQuery(value: string): void {
  try {
    window.localStorage.setItem(TEAM_QUERY_KEY, value);
  } catch {
    // Ignore — convenience only.
  }
}

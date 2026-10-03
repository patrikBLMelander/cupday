import type { PracticeMatch } from '@/features/practiceMatches/practiceMatchTypes';
import type { MockPracticeMatch } from '@/mocks/db';

/** ISO time `days` from now at the given local hour. */
export function inDays(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function buildMatch(overrides: Partial<PracticeMatch> = {}): PracticeMatch {
  return {
    id: crypto.randomUUID(),
    teamName: 'Västerort FF',
    gender: 'P',
    birthYear: 2013,
    level: 5,
    playersPerSide: 7,
    kickoffAt: inDays(1),
    venue: 'Grimsta IP',
    opponentSlots: 1,
    freeSlots: 1,
    bookedTeams: [],
    contactName: 'Anna Berg',
    contactPhone: '070-123 45 67',
    contactEmail: 'anna@example.com',
    costSek: null,
    notes: null,
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function buildMockMatch(overrides: Partial<MockPracticeMatch> = {}): MockPracticeMatch {
  return { ...buildMatch(overrides), manageToken: 'secret-token', ...overrides };
}

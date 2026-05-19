import { describe, expect, it } from 'vitest';

import { authApi } from '@/features/auth/authApi';
import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import type { Cup } from '@/features/cups/cupTypes';
import { hexToHslChannels } from '@/lib/color';
import { teamsApi } from '@/features/teams/teamsApi';
import { db } from '@/mocks/db';
import { makeTestStore } from '@/test/render';

function seedOpenCup(overrides: Partial<Cup> = {}): Cup {
  const cup: Cup = {
    id: 'cup-1',
    slug: 'test-cup',
    name: 'Test Cup',
    organizingClubName: 'IFK Test',
    organizingClubColors: {
      primary: hexToHslChannels('#1d4ed8'),
      accent: hexToHslChannels('#f1f5f9'),
    },
    startDate: '2026-06-01',
    endDate: '2026-06-01',
    venueName: 'Main field',
    pitchCount: 2,
    maxTeams: 8,
    registrationFeeSek: 100,
    paymentInstructions: '',
    paymentLagkassanLink: '',
    paymentLagkassanQrUrl: '',
    organizerContactName: 'Patrik',
    organizerContactEmail: 'p@example.com',
    organizerContactPhone: '0700000000',
    status: 'open',
    createdAt: '2026-01-01T00:00:00Z',
    playersPerTeam: 7,
    clubLogoUrl: '',
    useLevels: false,
    levels: [],
    activeTeamCount: 0,
    hasToilets: false,
    hasFood: false,
    hasParking: false,
    mapUrl: '',
    startTime: null,
    numberOfGroups: 2,
    teamsPerGroup: 4,
    ...overrides,
  };
  db.write((d) => {
    d.cups.push(cup);
  });
  return cup;
}

const baseBody = {
  clubName: 'Club A',
  contactName: 'Patrik',
  contactEmail: 'patrik@example.com',
  contactPhone: '0700000000',
};

describe('teamsApi (integration)', () => {
  it('creates a registration with two teams in reserved status', async () => {
    const cup = seedOpenCup();
    const store = makeTestStore();

    const result = await store
      .dispatch(
        teamsApi.endpoints.createRegistration.initiate({
          cupId: cup.id,
          body: { ...baseBody, teamNames: ['Lag 1', 'Lag 2'] },
        }),
      )
      .unwrap();

    expect(result.teamIds).toHaveLength(2);
    const teams = db.read().teams;
    expect(teams).toHaveLength(2);
    expect(teams.every((t) => t.status === 'reserved')).toBe(true);
    expect(teams.every((t) => t.registrationId === result.registrationId)).toBe(true);
  });

  it('returns 409 when a team name collides with an existing reserved team', async () => {
    const cup = seedOpenCup();
    const store = makeTestStore();

    await store
      .dispatch(
        teamsApi.endpoints.createRegistration.initiate({
          cupId: cup.id,
          body: { ...baseBody, teamNames: ['IFK'] },
        }),
      )
      .unwrap();

    const second = await store
      .dispatch(
        teamsApi.endpoints.createRegistration.initiate({
          cupId: cup.id,
          body: { ...baseBody, teamNames: ['ifk'] },
        }),
      )
      .unwrap()
      .catch((err: unknown) => err);

    const e = second as { status?: number; data?: { teamName?: string } };
    expect(e.status).toBe(409);
    expect(e.data?.teamName).toBe('ifk');
  });

  it('marks paid + cancels and rebounds the cup from full to open', async () => {
    const cup = seedOpenCup({ id: 'cup-rebound', slug: 'rebound', maxTeams: 2 });
    const store = makeTestStore();
    const login = await store
      .dispatch(
        authApi.endpoints.login.initiate({
          email: 'admin@example.com',
          password: 'secret123',
        }),
      )
      .unwrap();
    window.localStorage.setItem(TOKEN_STORAGE_KEY, login.token);

    const reg = await store
      .dispatch(
        teamsApi.endpoints.createRegistration.initiate({
          cupId: cup.id,
          body: { ...baseBody, teamNames: ['Lag 1', 'Lag 2'] },
        }),
      )
      .unwrap();

    expect(db.read().cups.find((c) => c.id === cup.id)?.status).toBe('full');

    const firstTeamId = reg.teamIds[0];
    const paid = await store
      .dispatch(
        teamsApi.endpoints.updateTeam.initiate({
          id: firstTeamId,
          cupId: cup.id,
          patch: { status: 'paid' },
        }),
      )
      .unwrap();
    expect(paid.status).toBe('paid');
    expect(paid.paidAt).not.toBeNull();

    await store
      .dispatch(
        teamsApi.endpoints.updateTeam.initiate({
          id: firstTeamId,
          cupId: cup.id,
          patch: { status: 'cancelled' },
        }),
      )
      .unwrap();

    expect(db.read().cups.find((c) => c.id === cup.id)?.status).toBe('open');
  });
});

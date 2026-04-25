import { describe, expect, it } from 'vitest';

import { authApi } from '@/features/auth/authApi';
import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import { cupsApi } from '@/features/cups/cupsApi';
import type { CupCreateRequest } from '@/features/cups/cupTypes';
import { hexToHslChannels } from '@/lib/color';
import { makeTestStore } from '@/test/render';

function buildCupBody(overrides: Partial<CupCreateRequest> = {}): CupCreateRequest {
  return {
    slug: 'test-cup',
    name: 'Test Cup',
    organizingClubName: 'Club A',
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
    paymentInstructions: 'Pay via QR',
    paymentLagkassanLink: 'https://example.com/lag',
    paymentLagkassanQrUrl: 'https://example.com/qr.png',
    organizerContactName: 'Patrik',
    organizerContactEmail: 'patrik@example.com',
    organizerContactPhone: '0700000000',
    ...overrides,
  };
}

describe('cupsApi (integration)', () => {
  it('creates, lists, gets, and patches a cup', async () => {
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

    const created = await store
      .dispatch(cupsApi.endpoints.createCup.initiate(buildCupBody()))
      .unwrap();
    expect(created.id).toBeTruthy();
    expect(created.status).toBe('draft');

    const list = await store
      .dispatch(cupsApi.endpoints.listCups.initiate())
      .unwrap();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);

    const fetched = await store
      .dispatch(cupsApi.endpoints.getCup.initiate(created.id))
      .unwrap();
    expect(fetched.name).toBe('Test Cup');

    const updated = await store
      .dispatch(
        cupsApi.endpoints.updateCup.initiate({ id: created.id, name: 'Renamed' }),
      )
      .unwrap();
    expect(updated.name).toBe('Renamed');
  });
});

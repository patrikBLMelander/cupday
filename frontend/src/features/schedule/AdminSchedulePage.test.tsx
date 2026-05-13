import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { authApi } from '@/features/auth/authApi';
import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import type { Cup } from '@/features/cups/cupTypes';
import { AdminSchedulePage } from '@/features/schedule/AdminSchedulePage';
import type { Team } from '@/features/teams/teamTypes';
import { hexToHslChannels } from '@/lib/color';
import { db } from '@/mocks/db';
import { makeTestStore } from '@/test/render';

function buildCup(): Cup {
  return {
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
  };
}

function buildTeam(overrides: Partial<Team>): Team {
  return {
    id: 'team-1',
    cupId: 'cup-1',
    registrationId: 'reg-1',
    name: 'Lag 1',
    clubName: 'Klubb',
    contactName: 'Patrik',
    contactEmail: 'p@example.com',
    contactPhone: '0700000000',
    groupLabel: null,
    status: 'reserved',
    createdAt: '2026-01-01T00:00:00Z',
    paidAt: null,
    cancelledAt: null,
    level: null,
    logoUrl: '',
    ...overrides,
  };
}

describe('AdminSchedulePage', () => {
  it('renders the requirements panel and hides the generate form when paid counts are not 4 + 4', async () => {
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

    db.write((d) => {
      d.cups.push(buildCup());
      // Only 2 paid teams in group A, none in B → not enough.
      d.teams.push(
        buildTeam({ id: 't1', name: 'A1', status: 'paid', groupLabel: 'A' }),
        buildTeam({ id: 't2', name: 'A2', status: 'paid', groupLabel: 'A' }),
      );
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/admin/cups/cup-1/schedule']}>
          <Routes>
            <Route
              path="/admin/cups/:id/schedule"
              element={<AdminSchedulePage />}
            />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(
      await screen.findByText(
        /requirements to generate|krav för att skapa/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /generate schedule|skapa spelschema/i,
      }),
    ).not.toBeInTheDocument();
  });
});

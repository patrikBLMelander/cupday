import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { PublicLayout } from '@/app/layouts/PublicLayout';
import type { Cup } from '@/features/cups/cupTypes';
import { PaymentPage } from '@/features/teams/PaymentPage';
import type { Registration, Team } from '@/features/teams/teamTypes';
import { hexToHslChannels } from '@/lib/color';
import { db } from '@/mocks/db';
import { makeTestStore } from '@/test/render';

function buildCup(overrides: Partial<Cup> = {}): Cup {
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
    registrationFeeSek: 500,
    paymentInstructions: 'Använd länken nedan',
    paymentLagkassanLink: 'https://example.com/lag',
    paymentLagkassanQrUrl: 'https://example.com/qr.png',
    organizerContactName: 'Patrik',
    organizerContactEmail: 'p@example.com',
    organizerContactPhone: '0700000000',
    status: 'open',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function buildTeam(overrides: Partial<Team>): Team {
  return {
    id: 'team-1',
    cupId: 'cup-1',
    registrationId: 'reg-1',
    name: 'IFK Lag 1',
    clubName: 'IFK',
    contactName: 'Patrik',
    contactEmail: 'p@example.com',
    contactPhone: '0700000000',
    groupLabel: null,
    status: 'reserved',
    createdAt: '2026-01-01T00:00:00Z',
    paidAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

function renderAt(path: string): void {
  render(
    <Provider store={makeTestStore()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/c/:slug" element={<PublicLayout />}>
            <Route path="payment/:registrationId" element={<PaymentPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('PaymentPage', () => {
  it('renders the registered teams and the Lagkassan link for a known registration', async () => {
    const cup = buildCup();
    const registration: Registration = {
      id: 'reg-1',
      cupId: cup.id,
      teamIds: ['team-1', 'team-2'],
      createdAt: '2026-01-01T00:00:00Z',
    };
    db.write((d) => {
      d.cups.push(cup);
      d.teams.push(
        buildTeam({ id: 'team-1', name: 'IFK Lag 1' }),
        buildTeam({ id: 'team-2', name: 'IFK Lag 2' }),
      );
      d.registrations.push(registration);
    });

    renderAt('/c/test-cup/payment/reg-1');

    expect(await screen.findByText('IFK Lag 1')).toBeInTheDocument();
    expect(screen.getByText('IFK Lag 2')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open lagkassan|öppna lagkassan/i }),
    ).toHaveAttribute('href', 'https://example.com/lag');
  });

  it('renders the not-found panel for an unknown registration id', async () => {
    db.write((d) => {
      d.cups.push(buildCup());
    });

    renderAt('/c/test-cup/payment/no-such-id');

    expect(
      await screen.findByRole('heading', {
        name: /registration not found|hittades inte/i,
      }),
    ).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { PublicLayout } from '@/app/layouts/PublicLayout';
import type { Cup } from '@/features/cups/cupTypes';
import { hexToHslChannels } from '@/lib/color';
import { db } from '@/mocks/db';
import { makeTestStore } from '@/test/render';

function buildCup(overrides: Partial<Cup> = {}): Cup {
  return {
    id: 'cup-1',
    slug: 'test-cup',
    name: 'Test Cup 2026',
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
    ...overrides,
  };
}

function renderAt(path: string): void {
  const store = makeTestStore();
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/c/:slug" element={<PublicLayout />}>
            <Route index element={<div>Inside</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('PublicLayout', () => {
  it('renders a back-to-landing link and the child route when the slug resolves', async () => {
    db.write((d) => {
      d.cups.push(buildCup());
    });
    renderAt('/c/test-cup');
    const backLink = await screen.findByRole('link', { name: /matchdag/i });
    expect(backLink).toHaveAttribute('href', '/');
    expect(await screen.findByText('Inside')).toBeInTheDocument();
  });

  it('renders a 404 page when the slug does not resolve', async () => {
    renderAt('/c/no-such-cup');
    expect(
      await screen.findByRole('heading', {
        name: /not found|hittades inte/i,
      }),
    ).toBeInTheDocument();
  });
});

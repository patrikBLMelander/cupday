import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { PublicLayout } from '@/app/layouts/PublicLayout';
import { PublicCupLandingPage } from '@/features/cups/PublicCupLandingPage';
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

describe('PublicCupLandingPage', () => {
  it('renders all three tabs and switches the panel when Teams is clicked', async () => {
    db.write((d) => {
      d.cups.push(buildCup());
    });
    const user = userEvent.setup();
    render(
      <Provider store={makeTestStore()}>
        <MemoryRouter initialEntries={['/c/test-cup']}>
          <Routes>
            <Route path="/c/:slug" element={<PublicLayout />}>
              <Route index element={<PublicCupLandingPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    const teamsTab = await screen.findByRole('tab', { name: /teams|lag/i });
    expect(teamsTab).toHaveAttribute('aria-selected', 'false');

    await user.click(teamsTab);
    expect(teamsTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByText(/teams will appear|lag visas/i),
    ).toBeInTheDocument();
  });
});

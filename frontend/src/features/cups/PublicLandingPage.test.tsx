import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Cup } from '@/features/cups/cupTypes';
import { PublicLandingPage } from '@/features/cups/PublicLandingPage';
import type { Team } from '@/features/teams/teamTypes';
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
    endDate: '2026-06-02',
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
    ...overrides,
  };
}

function renderPage(): void {
  render(
    <Provider store={makeTestStore()}>
      <MemoryRouter initialEntries={['/']}>
        <PublicLandingPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('PublicLandingPage', () => {
  beforeEach(() => {
    db.reset();
  });

  it('shows the empty state when no cups are published', async () => {
    renderPage();
    expect(
      await screen.findByText(/inga cuper.*just nu|no cups are open/i),
    ).toBeInTheDocument();
  });

  it('lists open cups with remaining spots and a view CTA', async () => {
    db.write((d) => {
      d.cups.push(
        buildCup({
          id: 'open-cup',
          slug: 'open-cup',
          name: 'Open Cup 2026',
          status: 'open',
          maxTeams: 8,
        }),
      );
      for (let i = 0; i < 3; i++) {
        d.teams.push(buildTeam(`open-cup`, `t-${i}`, `Lag ${i}`));
      }
    });
    renderPage();

    expect(await screen.findByText('Open Cup 2026')).toBeInTheDocument();
    expect(screen.getByText(/5 platser kvar|5 spots left/i)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /visa cup|view cup/i });
    expect(cta).toHaveAttribute('href', '/c/open-cup');
  });

  it('hides drafts and shows a Full badge when capacity is reached', async () => {
    db.write((d) => {
      d.cups.push(
        buildCup({
          id: 'draft',
          slug: 'draft',
          name: 'Draft Cup',
          status: 'draft',
        }),
        buildCup({
          id: 'full',
          slug: 'full',
          name: 'Full Cup',
          status: 'full',
        }),
      );
    });
    renderPage();

    expect(await screen.findByText('Full Cup')).toBeInTheDocument();
    expect(screen.queryByText('Draft Cup')).not.toBeInTheDocument();
    expect(screen.getByText(/fullsatt|^full$/i)).toBeInTheDocument();
  });
});

function buildTeam(cupId: string, id: string, name: string): Team {
  return {
    id,
    cupId,
    registrationId: `reg-${id}`,
    name,
    clubName: 'Klubb',
    contactName: 'Patrik',
    contactEmail: 'p@example.com',
    contactPhone: '0700',
    groupLabel: null,
    status: 'reserved',
    createdAt: '2026-01-01T00:00:00Z',
    paidAt: null,
    cancelledAt: null,
    logoUrl: '',
    level: null,
  };
}

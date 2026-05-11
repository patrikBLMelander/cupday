import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';

import type { Cup } from '@/features/cups/cupTypes';
import { PublicScheduleView } from '@/features/schedule/PublicScheduleView';
import type { Match } from '@/features/schedule/scheduleTypes';
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
    status: 'scheduled',
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
  };
}

function buildTeam(overrides: Partial<Team>): Team {
  return {
    id: 't',
    cupId: 'cup-1',
    registrationId: 'r',
    name: 'Team',
    clubName: 'Club',
    contactName: 'C',
    contactEmail: 'c@example.com',
    contactPhone: '000',
    groupLabel: null,
    status: 'paid',
    createdAt: '2026-01-01T00:00:00Z',
    paidAt: '2026-01-01T00:00:00Z',
    cancelledAt: null,
    level: null,
    ...overrides,
  };
}

function buildMatch(overrides: Partial<Match>): Match {
  return {
    id: 'm',
    cupId: 'cup-1',
    groupLabel: 'A',
    pitch: 1,
    startTime: '2026-06-01T10:00:00.000Z',
    homeTeamId: 'a1',
    awayTeamId: 'a2',
    ...overrides,
  };
}

describe('PublicScheduleView', () => {
  it('renders matches grouped by slot and the Group A filter narrows the list', async () => {
    db.write((d) => {
      d.cups.push(buildCup());
      d.teams.push(
        buildTeam({ id: 'a1', name: 'IFK A1', groupLabel: 'A' }),
        buildTeam({ id: 'a2', name: 'IFK A2', groupLabel: 'A' }),
        buildTeam({ id: 'b1', name: 'IFK B1', groupLabel: 'B' }),
        buildTeam({ id: 'b2', name: 'IFK B2', groupLabel: 'B' }),
      );
      d.matches.push(
        buildMatch({
          id: 'm1',
          groupLabel: 'A',
          startTime: '2026-06-01T10:00:00.000Z',
          homeTeamId: 'a1',
          awayTeamId: 'a2',
        }),
        buildMatch({
          id: 'm2',
          groupLabel: 'B',
          startTime: '2026-06-01T10:20:00.000Z',
          homeTeamId: 'b1',
          awayTeamId: 'b2',
        }),
      );
    });

    render(
      <Provider store={makeTestStore()}>
        <PublicScheduleView cupId="cup-1" />
      </Provider>,
    );

    expect(await screen.findByText('IFK A1')).toBeInTheDocument();
    expect(screen.getByText('IFK B1')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /group a|grupp a/i, pressed: false }),
    );

    expect(screen.getByText('IFK A1')).toBeInTheDocument();
    expect(screen.queryByText('IFK B1')).not.toBeInTheDocument();
  });
});

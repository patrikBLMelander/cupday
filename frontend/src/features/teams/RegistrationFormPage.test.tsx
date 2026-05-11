import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { PublicLayout } from '@/app/layouts/PublicLayout';
import type { Cup } from '@/features/cups/cupTypes';
import { RegistrationFormPage } from '@/features/teams/RegistrationFormPage';
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

function renderRegistration(): void {
  render(
    <Provider store={makeTestStore()}>
      <MemoryRouter initialEntries={['/c/test-cup/register']}>
        <Routes>
          <Route path="/c/:slug" element={<PublicLayout />}>
            <Route path="register" element={<RegistrationFormPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('RegistrationFormPage', () => {
  it('renders the form for an open cup', async () => {
    db.write((d) => {
      d.cups.push(buildCup());
    });
    renderRegistration();

    expect(
      await screen.findByRole('heading', { name: /register team|anmäl lag/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/^team name$|^lagets namn$/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /register another team|anmäl ett lag till/i,
      }),
    ).toBeInTheDocument();
  });

  it('renders the "registration not open" panel when the cup is in draft', async () => {
    db.write((d) => {
      d.cups.push(buildCup({ status: 'draft' }));
    });
    renderRegistration();

    expect(
      await screen.findByText(
        /registration is not open|anmälan är inte öppen/i,
      ),
    ).toBeInTheDocument();
  });

  it('persists the picked level when the cup uses levels', async () => {
    db.write((d) => {
      d.cups.push(
        buildCup({
          useLevels: true,
          levels: ['Lätt', 'Medel', 'Svår'],
        }),
      );
    });
    renderRegistration();
    const user = userEvent.setup();

    await screen.findByRole('heading', { name: /register team|anmäl lag/i });
    await user.type(
      screen.getByLabelText(/^club$|^klubb$/i),
      'IFK',
    );
    await user.type(
      screen.getByLabelText(/^contact name$|^kontaktperson$/i),
      'Patrik',
    );
    await user.type(
      screen.getByLabelText(/^email$|^e-post$/i),
      'p@example.com',
    );
    await user.type(
      screen.getByLabelText(/^phone$|^telefon$/i),
      '0700000000',
    );
    await user.type(
      screen.getByLabelText(/^team name$|^lagets namn$/i),
      'IFK Lag 1',
    );
    await user.selectOptions(
      screen.getByLabelText(/team level|nivå för laget/i),
      'Medel',
    );
    await user.click(
      screen.getByRole('button', { name: /^submit$|^anmäl$/i }),
    );

    await waitFor(() => {
      const team = db.read().teams.find((t) => t.cupId === 'cup-1');
      expect(team?.level).toBe('Medel');
    });
  });
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { PracticeLayout } from '@/features/practiceMatches/PracticeLayout';
import { PracticeMatchDetailPage } from '@/features/practiceMatches/PracticeMatchDetailPage';
import { buildMockMatch } from '@/features/practiceMatches/testFixtures';
import i18n from '@/lib/i18n';
import { db } from '@/mocks/db';
import { renderWithProviders } from '@/test/render';

function renderDetail(id: string): void {
  renderWithProviders(
    <Routes>
      <Route path="/matcher" element={<PracticeLayout />}>
        <Route path=":id" element={<PracticeMatchDetailPage />} />
      </Route>
    </Routes>,
    { initialEntries: [`/matcher/${id}`] },
  );
}

async function fillBooking(teamName: string): Promise<void> {
  const user = userEvent.setup();
  const form = await screen.findByRole('region', { name: 'Boka plats' });
  await user.clear(screen.getByLabelText('Ditt lag'));
  await user.type(screen.getByLabelText('Ditt lag'), teamName);
  await user.type(screen.getByLabelText('Kontaktperson'), 'Jonas Lind');
  await user.type(screen.getByLabelText('Telefon'), '070-765 43 21');
  await user.type(screen.getByLabelText('E-post'), 'jonas@example.com');
  await user.click(screen.getByRole('checkbox', { name: /arrangören får se/ }));
  await user.click(form.querySelector('button[type="submit"]') as HTMLElement);
}

describe('PracticeMatchDetailPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('sv');
  });

  it('books a free slot and offers to cancel it in the same browser', async () => {
    const match = buildMockMatch({ teamName: 'Solna BK', opponentSlots: 2, costSek: 0, notes: 'Vi har domare' });
    db.write((d) => {
      d.practiceMatches.push(match);
    });
    renderDetail(match.id);

    expect(await screen.findByRole('heading', { name: 'Solna BK söker motstånd' })).toBeInTheDocument();
    expect(screen.getByText('Gratis')).toBeInTheDocument();
    expect(screen.getByText('Vi har domare')).toBeInTheDocument();

    await fillBooking('Ekens IF F12');

    expect(await screen.findByText('Klart! Ekens IF F12 har bokat en plats.')).toBeInTheDocument();
    expect(screen.getByText('Ni har bokat som Ekens IF F12')).toBeInTheDocument();
    expect(await screen.findByText('1 av 2 platser lediga')).toBeInTheDocument();
  });

  it('explains when the team has already booked the match', async () => {
    const match = buildMockMatch({ opponentSlots: 2 });
    db.write((d) => {
      d.practiceMatches.push(match);
      d.practiceBookings.push({
        id: 'b1',
        matchId: match.id,
        teamName: 'Ekens IF F12',
        contactName: 'X',
        contactPhone: '1',
        contactEmail: 'x@example.com',
        message: null,
        status: 'booked',
        createdAt: new Date().toISOString(),
        cancelledAt: null,
        manageToken: 't',
      });
    });
    renderDetail(match.id);

    await fillBooking('ekens if f12');

    expect(await screen.findByText('ekens if f12 har redan bokat den här matchen.')).toBeInTheDocument();
  });
});

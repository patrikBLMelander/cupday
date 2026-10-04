import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { PracticeLayout } from '@/features/practiceMatches/PracticeLayout';
import { PracticeMatchListPage } from '@/features/practiceMatches/PracticeMatchListPage';
import { buildPostedCup, dateIn } from '@/features/postedCups/testFixtures';
import { buildMockMatch, inDays } from '@/features/practiceMatches/testFixtures';
import i18n from '@/lib/i18n';
import { db } from '@/mocks/db';
import { renderWithProviders } from '@/test/render';

function renderList(): void {
  renderWithProviders(
    <Routes>
      <Route path="/matcher" element={<PracticeLayout />}>
        <Route index element={<PracticeMatchListPage />} />
      </Route>
    </Routes>,
    { initialEntries: ['/matcher'] },
  );
}

describe('PracticeMatchListPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('sv');
    db.write((d) => {
      d.practiceMatches.push(
        buildMockMatch({ teamName: 'Hässelby SK', kickoffAt: inDays(1, 9), freeSlots: 0, opponentSlots: 1 }),
        buildMockMatch({ teamName: 'Solna BK', kickoffAt: inDays(1, 13), opponentSlots: 3 }),
        buildMockMatch({ teamName: 'Ekens IF F11', kickoffAt: inDays(2, 11), levelMin: 2, levelMax: 2 }),
      );
      d.practiceBookings.push({
        id: 'b1',
        matchId: d.practiceMatches[0].id,
        teamName: 'Spånga IS',
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
  });

  it('lists matches per day in time order and marks the next bookable one', async () => {
    renderList();

    const tomorrow = await screen.findByRole('region', { name: /imorgon/i });
    const cards = within(tomorrow).getAllByRole('link');
    expect(cards[0]).toHaveTextContent('Hässelby SK');
    expect(cards[0]).toHaveTextContent('Fullbokad');
    expect(cards[1]).toHaveTextContent('Solna BK');
    expect(cards[1]).toHaveTextContent('Nästa');
    expect(cards[1]).toHaveTextContent('3 av 3 platser lediga');
  });

  it('hides fully booked matches with "Bara lediga"', async () => {
    renderList();
    await screen.findByText('Solna BK');

    await userEvent.click(screen.getByRole('button', { name: 'Bara lediga' }));

    expect(screen.queryByText('Hässelby SK')).not.toBeInTheDocument();
    expect(screen.getByText('Solna BK')).toBeInTheDocument();
  });

  it('shows only my team\'s matches when searching by team name', async () => {
    renderList();
    await screen.findByText('Solna BK');

    await userEvent.type(screen.getByLabelText('Ditt lag'), 'Spånga');

    expect(screen.getByText('Hässelby SK')).toBeInTheDocument();
    expect(screen.getByText('Ni möter')).toBeInTheDocument();
    expect(screen.queryByText('Solna BK')).not.toBeInTheDocument();
  });

  it('pages the date strip a week ahead and loads matches beyond the first two weeks', async () => {
    db.write((d) => {
      d.practiceMatches.push(buildMockMatch({ teamName: 'Råsunda BK', kickoffAt: inDays(17, 10) }));
    });
    renderList();
    await screen.findByText('Solna BK');
    expect(screen.queryByText('Råsunda BK')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Föregående vecka' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Nästa vecka' }));

    expect(await screen.findByText('Råsunda BK')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Föregående vecka' })).toBeEnabled();
  });

  it('shows a cup as a distinct cup card that can be filtered away', async () => {
    db.write((d) => {
      d.cups.push(buildPostedCup({ name: 'Grimsta Höstcup', startDate: dateIn(1), endDate: dateIn(1) }));
    });
    renderList();

    const card = await screen.findByRole('article', { name: 'Cup: Grimsta Höstcup' });
    expect(within(card).getByText('CUP')).toBeInTheDocument();
    expect(within(card).getAllByRole('link', { name: 'Till cupen →' })[0]).toHaveAttribute('href', '/c/grimsta-hostcup');

    await userEvent.click(screen.getByRole('button', { name: 'Matcher' }));

    expect(screen.queryByRole('article', { name: 'Cup: Grimsta Höstcup' })).not.toBeInTheDocument();
    expect(screen.getByText('Solna BK')).toBeInTheDocument();
  });
});

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { PostedCupFormPage } from '@/features/postedCups/PostedCupFormPage';
import { PostedCupManagePage } from '@/features/postedCups/PostedCupManagePage';
import { SaveCupLinkPage } from '@/features/postedCups/SaveCupLinkPage';
import { saveCupToken } from '@/features/postedCups/cupTokens';
import { buildPostedCup, buildTeam, dateIn } from '@/features/postedCups/testFixtures';
import { PracticeLayout } from '@/features/practiceMatches/PracticeLayout';
import i18n from '@/lib/i18n';
import { db } from '@/mocks/db';
import { renderWithProviders } from '@/test/render';

function renderAt(path: string): void {
  renderWithProviders(
    <Routes>
      <Route path="/matcher" element={<PracticeLayout />}>
        <Route path="ny-cup" element={<PostedCupFormPage />} />
        <Route path="cup/:id/spara-lank" element={<SaveCupLinkPage />} />
        <Route path="cup/:id/hantera" element={<PostedCupManagePage />} />
      </Route>
    </Routes>,
    { initialEntries: [path] },
  );
}

describe('Posting a cup', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('sv');
  });

  it('publishes the cup and requires saving the admin link before the admin page', async () => {
    const user = userEvent.setup();
    renderAt('/matcher/ny-cup');

    await user.type(screen.getByLabelText('Cupens namn'), 'Grimsta Höstcup');
    await user.type(screen.getByLabelText('Arrangerande förening'), 'Västerort FF');
    await user.type(screen.getByLabelText('Första dagen'), dateIn(10));
    await user.type(screen.getByLabelText('Sista dagen'), dateIn(11));
    await user.type(screen.getByLabelText('Plats'), 'Grimsta IP');
    await user.click(screen.getByRole('checkbox', { name: 'Toaletter' }));
    await user.selectOptions(screen.getByLabelText('Födelseår'), '2013');
    await user.click(screen.getByRole('button', { name: 'Lägg till P13' }));
    await user.selectOptions(screen.getByLabelText('Födelseår'), '2014');
    await user.click(screen.getByRole('button', { name: 'Lägg till P14' }));
    await user.type(screen.getByLabelText('Avgift per lag (kr)'), '1200');
    await user.click(screen.getByRole('checkbox', { name: /Låsa platser per nivå/ }));
    for (const cls of ['P13', 'P14']) {
      const group = screen.getByRole('region', { name: cls });
      await user.click(within(group).getByRole('button', { name: `Lägg till nivå i ${cls}` }));
      await user.click(within(group).getByRole('button', { name: `Lägg till nivå i ${cls}` }));
      const [first, second] = within(group).getAllByLabelText('Nivå', { selector: 'select' });
      await user.selectOptions(first, 'Lätt');
      await user.selectOptions(second, 'Medel');
      for (const count of within(group).getAllByLabelText('Antal lag')) {
        await user.type(count, '4');
      }
    }
    expect(screen.getByText('Totalt 16 lag')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Kontaktperson'), 'Anna Berg');
    await user.type(screen.getByLabelText('Telefon'), '070-123 45 67');
    await user.type(screen.getByLabelText('E-post'), 'anna@vff.se');
    await user.click(screen.getByRole('checkbox', { name: /visas öppet/ }));
    await user.click(screen.getByRole('button', { name: 'Publicera cupen' }));

    expect(await screen.findByRole('heading', { name: 'Spara din adminlänk' })).toBeInTheDocument();
    const saved = db.read().cups[0];
    expect(saved).toMatchObject({
      name: 'Grimsta Höstcup',
      maxTeams: 16,
      ageClasses: ['P13', 'P14'],
      levels: ['Lätt', 'Medel'],
      publiclyPosted: true,
      hasToilets: true,
      hasFood: false,
    });
    expect(saved.slotQuotas?.map((q) => `${q.ageClass}/${q.level}/${q.maxTeams}`)).toEqual([
      'P13/Lätt/4',
      'P13/Medel/4',
      'P14/Lätt/4',
      'P14/Medel/4',
    ]);
    expect(screen.getByRole('link', { name: 'Mejla länken till mig' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:anna%40vff.se'),
    );

    const continueButton = screen.getByRole('button', { name: 'Fortsätt till adminsidan' });
    expect(continueButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Jag har sparat länken/ }));
    await user.click(continueButton);

    expect(await screen.findByRole('heading', { name: 'Grimsta Höstcup' })).toBeInTheDocument();
    expect(screen.getByText('Inga lag har anmält sig än. Dela cupens sida!')).toBeInTheDocument();
  });

  it('lets the organizer mark a registered team as paid', async () => {
    const cup = buildPostedCup();
    db.write((d) => {
      d.cups.push(cup);
      d.postedCupTokens[cup.id] = 'cup-token';
      d.teams.push(
        buildTeam(cup.id, { ageClass: 'P13' }),
        buildTeam(cup.id, { name: 'Bergsjö IK P14', ageClass: 'P14', level: 'Svår', status: 'paid' }),
      );
    });
    saveCupToken(cup.id, 'cup-token');
    renderAt(`/matcher/cup/${cup.id}/hantera`);

    const medel = await screen.findByRole('region', { name: 'P13 · Medel' });
    const toggle = within(medel).getByRole('switch', { name: 'Betald: Solna BK P13' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(toggle);

    expect(await within(medel).findByText('Betald')).toBeInTheDocument();
    expect(db.read().teams.find((t) => t.name === 'Solna BK P13')?.status).toBe('paid');
  });

  it('rejects a manage page without a valid admin link', async () => {
    const cup = buildPostedCup();
    db.write((d) => {
      d.cups.push(cup);
      d.postedCupTokens[cup.id] = 'cup-token';
    });
    renderAt(`/matcher/cup/${cup.id}/hantera`);

    expect(await screen.findByText(/Länken är ogiltig/)).toBeInTheDocument();
  });
});

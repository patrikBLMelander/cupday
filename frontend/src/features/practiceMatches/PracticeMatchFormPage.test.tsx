import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { PracticeLayout } from '@/features/practiceMatches/PracticeLayout';
import { PracticeMatchFormPage } from '@/features/practiceMatches/PracticeMatchFormPage';
import { PracticeMatchManagePage } from '@/features/practiceMatches/PracticeMatchManagePage';
import { localDateKey } from '@/features/practiceMatches/practiceMatchFeed';
import i18n from '@/lib/i18n';
import { db } from '@/mocks/db';
import { renderWithProviders } from '@/test/render';

function renderForm(): void {
  renderWithProviders(
    <Routes>
      <Route path="/matcher" element={<PracticeLayout />}>
        <Route path="ny" element={<PracticeMatchFormPage />} />
        <Route path=":id/hantera" element={<PracticeMatchManagePage />} />
      </Route>
    </Routes>,
    { initialEntries: ['/matcher/ny'] },
  );
}

describe('PracticeMatchFormPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('sv');
  });

  it('requires every field except cost and notes', async () => {
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Publicera match' }));

    expect(await screen.findAllByText('Fyll i det här fältet')).toHaveLength(9);
    expect(screen.getByText('Du behöver godkänna för att gå vidare')).toBeInTheDocument();
    expect(screen.getByLabelText('Kostnad per lag i kr (valfritt)')).not.toHaveAttribute('aria-invalid', 'true');
    expect(db.read().practiceMatches).toHaveLength(0);
  });

  it('publishes the match and shows the manage link', async () => {
    const user = userEvent.setup();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    renderForm();

    await user.type(screen.getByLabelText('Ditt lag'), 'Ekens IF F11');
    await user.type(screen.getByLabelText('Datum'), localDateKey(tomorrow));
    await user.type(screen.getByLabelText('Starttid'), '11:15');
    await user.type(screen.getByLabelText('Sluttid'), '12:45');
    await user.type(screen.getByLabelText('Plats'), 'Ekens BP, plan 4');
    await user.click(screen.getByRole('radio', { name: 'Flickor' }));
    await user.selectOptions(screen.getByLabelText('Födelseår'), '2015');
    await user.click(screen.getByRole('radio', { name: '5v5' }));
    await user.click(screen.getByRole('button', { name: 'Lätt' }));
    await user.click(screen.getByRole('button', { name: 'Medel' }));
    expect(screen.getByText('Vald nivå: Lätt–Medel')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fler platser' }));
    await user.type(screen.getByLabelText('Namn'), 'Ali Hassan');
    await user.type(screen.getByLabelText('Telefon'), '070-123 45 67');
    await user.type(screen.getByLabelText('E-post'), 'ali@example.com');
    await user.type(screen.getByLabelText('Kostnad per lag i kr (valfritt)'), '200');
    await user.click(screen.getByRole('checkbox', { name: /visas öppet/ }));
    await user.click(screen.getByRole('button', { name: 'Publicera match' }));

    expect(await screen.findByText('Matchen är upplagd!')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Viktigt: spara länken nu!' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mejla länken till mig' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:ali%40example.com'),
    );
    expect(screen.getByRole('region', { name: 'Dela matchen i din lagchatt' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dela i WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('Ekens IF F11 söker motstånd!')),
    );
    await user.click(screen.getByRole('button', { name: 'Jag har sparat länken' }));
    expect(screen.getByRole('heading', { name: 'Din hanteringslänk' })).toBeInTheDocument();
    const link = screen.getByLabelText<HTMLInputElement>('Hanteringslänk').value;
    expect(link).toContain(`#${db.read().practiceMatches[0].manageToken}`);
    const saved = db.read().practiceMatches[0];
    expect(saved).toMatchObject({
      teamName: 'Ekens IF F11',
      gender: 'F',
      birthYear: 2015,
      playersPerSide: 5,
      levelMin: 2,
      levelMax: 5,
      opponentSlots: 2,
      costSek: 200,
      notes: null,
    });
  });
});

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { authApi } from '@/features/auth/authApi';
import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import { AdminPracticeMatchesPage } from '@/features/practiceMatches/AdminPracticeMatchesPage';
import { buildMockMatch } from '@/features/practiceMatches/testFixtures';
import i18n from '@/lib/i18n';
import { db } from '@/mocks/db';
import { makeTestStore, renderWithProviders } from '@/test/render';

describe('AdminPracticeMatchesPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('sv');
  });

  it('lists posted matches with contact details and deletes one after confirmation', async () => {
    db.write((d) => {
      d.practiceMatches.push(
        buildMockMatch({ teamName: 'Spam FC', contactEmail: 'spam@example.com' }),
        buildMockMatch({ teamName: 'Solna BK' }),
      );
    });
    const store = makeTestStore();
    const login = await store
      .dispatch(authApi.endpoints.login.initiate({ email: 'admin@example.com', password: 'secret123' }))
      .unwrap();
    window.localStorage.setItem(TOKEN_STORAGE_KEY, login.token);
    renderWithProviders(<AdminPracticeMatchesPage />, { store });

    expect(await screen.findByText('Spam FC')).toBeInTheDocument();
    expect(screen.getByText(/spam@example\.com/)).toBeInTheDocument();
    expect(screen.getByText('2 matcher')).toBeInTheDocument();

    const spamCard = screen.getByText('Spam FC').closest('li') as HTMLElement;
    await userEvent.click(within(spamCard).getByRole('button', { name: 'Ta bort' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ja, ta bort permanent' }));

    expect(await screen.findByText('1 match')).toBeInTheDocument();
    expect(screen.queryByText('Spam FC')).not.toBeInTheDocument();
    expect(db.read().practiceMatches.map((m) => m.teamName)).toEqual(['Solna BK']);
  });
});

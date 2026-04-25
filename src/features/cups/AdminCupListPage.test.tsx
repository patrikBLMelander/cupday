import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { authApi } from '@/features/auth/authApi';
import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import { AdminCupListPage } from '@/features/cups/AdminCupListPage';
import { makeTestStore, renderWithProviders } from '@/test/render';

describe('AdminCupListPage', () => {
  it('renders the empty state with a create CTA when no cups exist', async () => {
    const store = makeTestStore();
    const login = await store
      .dispatch(
        authApi.endpoints.login.initiate({
          email: 'admin@example.com',
          password: 'secret123',
        }),
      )
      .unwrap();
    window.localStorage.setItem(TOKEN_STORAGE_KEY, login.token);

    renderWithProviders(<AdminCupListPage />, { store });

    expect(
      await screen.findByText(/no cups yet|inga cuper/i),
    ).toBeInTheDocument();
    const ctas = await screen.findAllByRole('link', {
      name: /create cup|skapa cup/i,
    });
    expect(ctas.length).toBeGreaterThan(0);
  });
});

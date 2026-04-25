import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { authApi } from '@/features/auth/authApi';
import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import { AdminCupSettingsPage } from '@/features/cups/AdminCupSettingsPage';
import { makeTestStore, renderWithProviders } from '@/test/render';

describe('AdminCupSettingsPage', () => {
  it('blocks submit and surfaces required-field errors when the form is empty', async () => {
    const user = userEvent.setup();
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

    renderWithProviders(<AdminCupSettingsPage />, { store });

    await user.click(screen.getByRole('button', { name: /^save$|^spara$/i }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
  });
});

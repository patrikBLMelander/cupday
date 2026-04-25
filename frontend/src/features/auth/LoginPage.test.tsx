import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { LoginPage } from '@/features/auth/LoginPage';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

describe('LoginPage', () => {
  it('keeps the submit button disabled until inputs are valid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { initialEntries: ['/admin/login'] });

    const submit = screen.getByRole('button', { name: /sign in|logga in/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/email|e-post/i), 'patrik@example.com');
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/password|lösenord/i), 'secret123');
    expect(submit).toBeEnabled();
  });

  it('shows an invalid-credentials error when the server returns 401', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Invalid credentials',
            status: 401,
            detail: 'nope',
          },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { initialEntries: ['/admin/login'] });

    await user.type(screen.getByLabelText(/email|e-post/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password|lösenord/i), 'badpass1');
    await user.click(screen.getByRole('button', { name: /sign in|logga in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /invalid email or password|felaktig/i,
    );
  });
});

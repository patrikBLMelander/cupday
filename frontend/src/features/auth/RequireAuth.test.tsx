import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RequireAuth } from '@/features/auth/RequireAuth';
import { renderWithProviders } from '@/test/render';

describe('RequireAuth', () => {
  it('redirects to /admin/login when getMe returns 401', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/admin" element={<div>Protected zone</div>} />
        </Route>
        <Route path="/admin/login" element={<div>Login here</div>} />
      </Routes>,
      { initialEntries: ['/admin'] },
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByText('Login here')).toBeInTheDocument();
  });
});

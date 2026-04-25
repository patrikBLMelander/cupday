import { describe, expect, it } from 'vitest';

import { authApi } from '@/features/auth/authApi';
import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import { makeTestStore } from '@/test/render';

describe('authApi (integration)', () => {
  it('round-trips login → me → logout', async () => {
    const store = makeTestStore();
    const credentials = { email: 'patrik@example.com', password: 'secret123' };

    const login = await store
      .dispatch(authApi.endpoints.login.initiate(credentials))
      .unwrap();
    expect(login.user.email).toBe(credentials.email);
    expect(login.token).toMatch(/.+/);

    window.localStorage.setItem(TOKEN_STORAGE_KEY, login.token);

    const me = await store.dispatch(authApi.endpoints.getMe.initiate()).unwrap();
    expect(me.user.email).toBe(credentials.email);

    await store.dispatch(authApi.endpoints.logout.initiate()).unwrap();
  });
});

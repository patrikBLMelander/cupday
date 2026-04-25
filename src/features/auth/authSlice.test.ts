import { describe, expect, it } from 'vitest';

import {
  authReducer,
  TOKEN_STORAGE_KEY,
  tokenCleared,
  tokenSet,
  type AuthState,
} from '@/features/auth/authSlice';

describe('authSlice', () => {
  it('tokenSet stores the token in state and localStorage', () => {
    const next = authReducer({ token: null }, tokenSet('abc'));
    expect(next.token).toBe('abc');
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('abc');
  });

  it('tokenCleared removes the token from state and localStorage', () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'abc');
    const initial: AuthState = { token: 'abc' };
    const next = authReducer(initial, tokenCleared());
    expect(next.token).toBeNull();
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});

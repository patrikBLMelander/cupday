import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const TOKEN_STORAGE_KEY = 'cup.auth.token';

export type AuthState = {
  token: string | null;
};

function readTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function writeTokenToStorage(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token === null) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: (): AuthState => ({ token: readTokenFromStorage() }),
  reducers: {
    tokenSet(state, action: PayloadAction<string>) {
      state.token = action.payload;
      writeTokenToStorage(action.payload);
    },
    tokenCleared(state) {
      state.token = null;
      writeTokenToStorage(null);
    },
  },
  selectors: {
    selectAuthToken: (state) => state.token,
  },
});

export const { tokenSet, tokenCleared } = authSlice.actions;
export const { selectAuthToken } = authSlice.selectors;
export const authReducer = authSlice.reducer;

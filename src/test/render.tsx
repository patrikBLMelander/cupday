import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { authApi } from '@/features/auth/authApi';
import { authReducer } from '@/features/auth/authSlice';
import { cupsApi } from '@/features/cups/cupsApi';
import { scheduleApi } from '@/features/schedule/scheduleApi';
import { teamsApi } from '@/features/teams/teamsApi';

export function makeTestStore(): ReturnType<typeof configureStore<{
  auth: ReturnType<typeof authReducer>;
  [authApi.reducerPath]: ReturnType<typeof authApi.reducer>;
  [cupsApi.reducerPath]: ReturnType<typeof cupsApi.reducer>;
  [teamsApi.reducerPath]: ReturnType<typeof teamsApi.reducer>;
  [scheduleApi.reducerPath]: ReturnType<typeof scheduleApi.reducer>;
}>> {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
      [cupsApi.reducerPath]: cupsApi.reducer,
      [teamsApi.reducerPath]: teamsApi.reducer,
      [scheduleApi.reducerPath]: scheduleApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        authApi.middleware,
        cupsApi.middleware,
        teamsApi.middleware,
        scheduleApi.middleware,
      ),
  });
  setupListeners(store.dispatch);
  return store;
}

type Options = Omit<RenderOptions, 'wrapper'> & {
  initialEntries?: string[];
  store?: ReturnType<typeof makeTestStore>;
};

export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ['/'], store = makeTestStore(), ...rest }: Options = {},
): ReturnType<typeof render> & { store: ReturnType<typeof makeTestStore> } {
  function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </Provider>
    );
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...rest }) };
}

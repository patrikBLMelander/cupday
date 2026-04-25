import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { authApi } from '@/features/auth/authApi';
import { authReducer } from '@/features/auth/authSlice';

export function makeTestStore(): ReturnType<typeof configureStore<{
  auth: ReturnType<typeof authReducer>;
  [authApi.reducerPath]: ReturnType<typeof authApi.reducer>;
}>> {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware),
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

# Task 01 — Mock Auth + Admin Shell

## User Story

As the cup organizer, I want to log in with email and password so that I can reach the admin area, and stay logged in across page reloads. I want to be able to log out, and to switch the UI language between Swedish and English.

## Goal

Wire mock authentication end-to-end and put the admin shell in place. After this task, every subsequent admin feature plugs into a working login + protected layout.

## Scope

1. Mock auth REST endpoints (login, logout, me) backed by `MockDB`.
2. `authApi` RTK Query slice and `authSlice` (token state, persisted to `localStorage`).
3. `LoginPage` at `/admin/login`.
4. `RequireAuth` route guard wrapping `/admin/*`.
5. `AdminLayout` shell with header (app title, language switcher, logout button).
6. `/admin` route shows a temporary "Welcome" placeholder until the cup list lands in Task 02.
7. `LanguageSwitcher` component reused later in `PublicLayout`.

## Out of scope

- Cup list / cup CRUD — Task 02.
- Public landing / theming — Task 03.
- Forgot-password, registration, multi-user.

## Mock auth behavior

- `POST /api/auth/login` — body `{ email, password }`.
  - Validate: email matches `/^.+@.+\..+$/`, password length ≥ 6.
  - On valid input: find or auto-create a user in `MockDB.users` keyed by email, store a session row `{ token: uuid, userId }` in `MockDB.sessions`, return `{ token, user }`.
  - On invalid input or any other failure: 401 with RFC-7807 problem detail (`type`, `title`, `status`, `detail`).
- `POST /api/auth/logout` — header `Authorization: Bearer <token>`. Removes the session row. Always returns 204 (idempotent).
- `GET /api/auth/me` — header `Authorization: Bearer <token>`. Returns `{ user }` if the token matches an active session, else 401.

Token persistence: store under `localStorage["cup.auth.token"]`. RTK Query's `prepareHeaders` injects `Authorization: Bearer <token>` for any endpoint that opts in.

## UX details

- **LoginPage:** email and password inputs (shadcn `input` + `label`), "Sign in" button. Submit disabled while either field fails client-side validation (same rules as the mock backend). Show a single error region above the form: "Invalid email or password" on 401, "Login failed — please try again" on network/other errors. Pressing Enter submits.
- **AdminLayout header:** left = app title (link to `/admin`), right = language switcher + logout button. Mobile-friendly (header wraps if needed).
- **RequireAuth:** while `getMe` is pending and we don't yet know auth status, render a centered spinner. On 401, redirect to `/admin/login` and remember the attempted path in router state. After successful login, redirect to that remembered path or `/admin`.
- **LanguageSwitcher:** two buttons (`SV` / `EN`); active language has a different visual state. Persists to `localStorage["cup.lang"]` via `i18next-browser-languagedetector` (already configured).

## shadcn/ui components to add

`button`, `input`, `label`, `card`. Run `npx shadcn@latest add button input label card`.

## Files to create

- `src/features/auth/authApi.ts` — RTK Query slice: `login`, `logout`, `getMe`. Provides/invalidates a single `Auth` tag.
- `src/features/auth/authSlice.ts` — token slice. Reads initial token from localStorage; reducer actions `tokenSet(token)`, `tokenCleared()`. Both write through to localStorage.
- `src/features/auth/LoginPage.tsx`
- `src/features/auth/RequireAuth.tsx`
- `src/app/layouts/AdminLayout.tsx`
- `src/components/LanguageSwitcher.tsx`

## Files to modify

- `src/app/store.ts` — register `authReducer` and `authApi.reducer`/`authApi.middleware`.
- `src/app/routes.tsx` — replace the placeholder route tree:
  - `/` → for now still the `HomePlaceholder` (will become a redirect to `/admin` in a later task).
  - `/admin/login` → `LoginPage`.
  - `/admin` → `RequireAuth` → `AdminLayout` → temporary "Welcome" placeholder element.
- `src/mocks/handlers.ts` — add the three auth handlers above. Replace the `/api/health` stub.
- `src/mocks/db.ts` — keep types open enough for the auth user shape: `{ id, email }` (no `passwordHash` needed in MVP since any password ≥ 6 is accepted).
- `src/locales/sv/translation.json` and `src/locales/en/translation.json` — add keys: `auth.signIn`, `auth.email`, `auth.password`, `auth.logout`, `auth.invalidCredentials`, `auth.loginFailed`, `admin.welcome`, `admin.languageSwedish`, `admin.languageEnglish`.

## Tests

- `authSlice` — `tokenSet` writes to localStorage; `tokenCleared` removes it; module reads initial token from localStorage on import.
- `LoginPage` — submit disabled until valid; on 401 shows "Invalid email or password"; on success calls navigate.
- `RequireAuth` — when `getMe` returns 401, redirects to `/admin/login` with the original path in state.
- `LanguageSwitcher` — clicking `EN` updates `i18n.language` and the active state.
- MSW integration — login → me → logout round-trip via the `server` fixture.

Tests should be proportional. Don't write more than ~2–3 tests per file.

## Risks / notes

- RTK Query's middleware must be added to the store *after* `getDefaultMiddleware()` — easy to miss.
- `RequireAuth` should not flash the login page: render the spinner until `getMe` settles.
- `MockDB` is shared between MSW browser and node; the node server has no `window.localStorage`. The DB module already handles that case (returns empty initial state).
- Avoid putting the bearer token in Redux state as well as localStorage *and* RTK Query headers — pick one source of truth (localStorage, read at request time via `prepareHeaders`).

## Acceptance criteria

- [ ] `/admin/login` renders email + password inputs and a disabled-by-default submit button that enables once both fields are valid.
- [ ] Submitting valid credentials redirects to `/admin` (or to a previously attempted protected path).
- [ ] Submitting an invalid email or short password keeps the user on the page and shows "Invalid email or password".
- [ ] `/admin` redirects to `/admin/login` when no valid token is present.
- [ ] `/admin` renders the `AdminLayout` with a "Welcome" placeholder when authenticated.
- [ ] Refreshing the browser keeps the user logged in.
- [ ] The header logout button clears the session and returns to `/admin/login`.
- [ ] The language switcher toggles the UI between Swedish and English; the choice survives a page reload.
- [ ] All user-facing strings go through `t()`.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run test:once` all pass.

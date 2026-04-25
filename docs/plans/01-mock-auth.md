# Plan: Task 01 — Mock Auth + Admin Shell

Implementation plan for `docs/tasks/01-mock-auth.md`. Approved 2026-04-25, cadence B (push through all iterations, only stop on failure or ambiguity).

## Decisions confirmed up front

- `/admin/login` while authenticated → redirect to `/admin` (or `state.from`).
- Language switcher i18n keys live under `common.*` (not `admin.*`).
- `MockDB.users` drops `passwordHash`.
- `Welcome` placeholder is inlined in the route element, no separate file.
- Single source of truth for the bearer token is `localStorage`. RTK Query reads it at request time. The `authSlice` mirrors it for components but writes go through the slice's reducers.
- Two-field login form uses controlled `useState` instead of `react-hook-form` — RHF arrives with the registration form in Task 04 when it pulls its weight.

## Files to create

- `src/features/auth/authApi.ts` — RTK Query slice. Endpoints: `login`, `logout`, `getMe`. Tag: `Auth`.
- `src/features/auth/authSlice.ts` — `{ token: string | null }`. Reducers `tokenSet`, `tokenCleared`, both persist to `localStorage["cup.auth.token"]`.
- `src/features/auth/LoginPage.tsx`
- `src/features/auth/RequireAuth.tsx`
- `src/app/layouts/AdminLayout.tsx`
- `src/components/LanguageSwitcher.tsx`

## Files to modify

- `src/app/store.ts` — register `auth` reducer + `authApi` reducer/middleware.
- `src/app/routes.tsx` — `/admin/login`, protected `/admin` (RequireAuth → AdminLayout → inline Welcome). Keep `/` as `HomePlaceholder`.
- `src/mocks/handlers.ts` — replace `/api/health` with three auth handlers. RFC-7807 problem details on 401.
- `src/mocks/db.ts` — drop `passwordHash`.

## CLI step

`npx shadcn@latest add button input label card` → generates `src/components/ui/{button,input,label,card}.tsx`.

## i18n keys

```
auth: { signIn, email, password, logout, invalidCredentials, loginFailed }
admin: { welcome }
common: { languageSwedish, languageEnglish, loading }
```

## Tests (proportional)

| File | Count | What |
|---|---|---|
| `authSlice.test.ts` | 2 | `tokenSet` writes localStorage; `tokenCleared` removes it. |
| `authApi.test.ts` | 1 | login → me → logout round-trip via MSW node server. |
| `LoginPage.test.tsx` | 2 | Submit disabled until valid; 401 shows `auth.invalidCredentials`. |
| `RequireAuth.test.tsx` | 1 | Redirects to `/admin/login` when `getMe` returns 401. |
| `LanguageSwitcher.test.tsx` | 1 | Clicking `EN` updates `aria-pressed`. |

`beforeEach(() => localStorage.clear())` in any test that touches the slice.

## Iterations

| # | Files | Verify |
|---|---|---|
| 1 | `mocks/db.ts`, `mocks/handlers.ts`, locales × 2 | lint, typecheck |
| 2 | `authApi.ts`, `authSlice.ts`, `store.ts` | lint, typecheck |
| 3 | `npx shadcn add ...` | lint |
| 4 | `LoginPage.tsx`, `RequireAuth.tsx`, `LanguageSwitcher.tsx` | lint, typecheck |
| 5 | `AdminLayout.tsx`, `routes.tsx` | lint, typecheck |
| 6 | tests (5 files) | `test:once` |

Final gate: `lint`, `typecheck`, `test:once`, `build`, manual `dev` smoke, diff scan.

## Risks

- RTK Query middleware order — `getDefaultMiddleware().concat(authApi.middleware)`.
- RequireAuth flash — render spinner while `getMe` is pending.
- localStorage pollution between tests — `beforeEach(() => localStorage.clear())`.
- shadcn CLI may prompt — use `--yes` if it stalls.

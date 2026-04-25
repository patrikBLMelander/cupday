# Plan: Task 04 — Public Registration Form

Implementation plan for `docs/tasks/04-public-registration.md`. Approved 2026-04-25, cadence B.

## Files to create

- `src/features/teams/teamTypes.ts` — `TeamStatus`, `Team`, `Registration`, `RegistrationCreateRequest`, `RegistrationCreateResponse`, `PublicTeam`.
- `src/features/teams/teamsApi.ts` — RTK Query slice. Endpoints: `createRegistration` (mutation), `listPublicTeamsByCup` (query). Tag types `['Teams', 'Cup', 'Cups']` so creating a registration invalidates the cup cache (status may auto-transition to `full`).
- `src/features/teams/RegistrationFormPage.tsx` — page with pre-flight gates and the form (RHF, single team-name input + "Add another team" reveal).
- 2 test files.

## Files to modify

- `src/mocks/db.ts` — type `teams: Team[]`, `registrations: Registration[]`.
- `src/mocks/handlers.ts` — add `POST /api/cups/:id/registrations` and `GET /api/cups/:id/teams`.
- `src/app/store.ts` — register `teamsApi`.
- `src/test/render.tsx` — register `teamsApi` in the test store.
- `src/app/routes.tsx` — swap `register` `ComingSoon` for `RegistrationFormPage`.
- `src/locales/{sv,en}/translation.json` — `registration.*` keys.

## Dependency

`npm install react-hook-form` (no resolver / zod yet).

## Iterations

| # | Files | Verify |
|---|---|---|
| 1 | `teamTypes.ts`, `mocks/db.ts`, `mocks/handlers.ts` | lint, typecheck |
| 2 | install RHF, `teamsApi.ts`, `store.ts`, `test/render.tsx` | lint, typecheck |
| 3 | locales × 2, `RegistrationFormPage.tsx` | lint, typecheck |
| 4 | `routes.tsx`, 2 test files | lint, typecheck, test:once, build, dev smoke |

## Tests

| File | Count |
|---|---|
| `teamsApi.test.ts` | 2 — happy-path round trip + 409 collision |
| `RegistrationFormPage.test.tsx` | 2 — renders form for open cup; renders "not open" panel for draft |

## Risks

- **`createRegistration` → cup cache invalidation** — both APIs declare the `Cup`/`Cups` tag types; the mutation invalidates both.
- **Optional team-name validation** — RHF cross-field via `validate` reading `getValues('teamName1')`; only fires when the second is present.
- **Toggle off second team** — call `unregister('teamName2')` to drop value from submitted payload and clear errors.
- **Atomic db.write** in the handler does the team insert + cup status flip in one updater so the read-modify-write race is contained.

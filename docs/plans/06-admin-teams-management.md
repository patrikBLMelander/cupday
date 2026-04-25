# Plan: Task 06 — Admin Teams Management

Implementation plan for `docs/tasks/06-admin-teams-management.md`. Approved 2026-04-25, cadence B.

## Files to create

- `src/features/teams/AdminTeamsPage.tsx` — admin teams page with filter + per-team card + actions.
- `src/features/teams/AdminTeamsPage.test.tsx` — 1 test (renders list + Mark paid updates the badge).

## Files to modify

- `src/features/teams/teamsApi.ts` — add `listAdminTeamsByCup` and `updateTeam`. Extend `tagTypes` with `'AdminTeams'`. `updateTeam` invalidates `AdminTeams`, `Teams`, `Cup`, `Cups`.
- `src/mocks/handlers.ts` — add `GET /api/admin/cups/:id/teams` and `PATCH /api/admin/teams/:id`. PATCH stamps `paidAt`/`cancelledAt`, rebounds cup `full → open` on a cancellation that drops below `maxTeams`.
- `src/app/routes.tsx` — add `/admin/cups/:id/teams` under the AdminLayout branch.
- `src/features/cups/AdminCupSettingsPage.tsx` — add "Manage teams" link near the back button (edit mode only).
- `src/features/cups/PublicCupLandingPage.tsx` — populate Teams tab via `useListPublicTeamsByCupQuery`.
- `src/locales/{sv,en}/translation.json` — `admin.teams.*` and `public.teamsList.*` keys.
- `src/features/teams/teamsApi.test.ts` — append a "mark paid + cancel + cup rebound" integration test.

## Iterations

| # | Files | Verify |
|---|---|---|
| 1 | `mocks/handlers.ts`, `teamsApi.ts` | lint, typecheck |
| 2 | locales × 2, `AdminTeamsPage.tsx`, `routes.tsx` | lint, typecheck |
| 3 | `AdminCupSettingsPage.tsx` (link), `PublicCupLandingPage.tsx` (teams tab) | lint, typecheck |
| 4 | `AdminTeamsPage.test.tsx` (new), `teamsApi.test.ts` (extend) | test:once, build, dev smoke |

## Notes

- Group dropdown uses native `<select>` styled with Tailwind (no shadcn select dep yet).
- `window.confirm` for cancel — fine for MVP.
- Cup `full → open` rebound happens server-side inside the same `db.write` updater that flips the team status; client-side cache invalidation handles the cup-list refresh.

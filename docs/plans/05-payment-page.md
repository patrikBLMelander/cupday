# Plan: Task 05 — Payment Page

Implementation plan for `docs/tasks/05-payment-page.md`. Approved 2026-04-25, cadence B.

## Files to create

- `src/features/teams/PaymentPage.tsx` — fetches registration, reads cup from outlet context, renders the three cards (teams / payment / cancellation) plus a back link. 404 panel for invalid id.
- `src/features/teams/PaymentPage.test.tsx` — 2 tests (happy path + 404).

## Files to modify

- `src/features/teams/teamsApi.ts` — add `getRegistration` query; extend `tagTypes` with `'Registration'`.
- `src/mocks/handlers.ts` — add `GET /api/registrations/:id` returning `{ registration, teams: PublicTeam[] }` (404 if missing).
- `src/app/routes.tsx` — swap the `/c/:slug/payment/:registrationId` `ComingSoon` for `<PaymentPage />`.
- `src/locales/{sv,en}/translation.json` — `payment.*` keys.

## Iterations

| # | Files | Verify |
|---|---|---|
| 1 | `mocks/handlers.ts`, `teamsApi.ts` | lint, typecheck |
| 2 | locales × 2, `PaymentPage.tsx`, `routes.tsx` | lint, typecheck |
| 3 | `PaymentPage.test.tsx`, run all gates + dev smoke | test:once, build, lint |

## Notes

- The cup itself is already in the outlet context via `PublicLayout` — no new cup query needed.
- 404 from `useGetRegistrationQuery` is the trigger for the "Registration not found" panel (`isError` + check `error.status === 404` for clarity).
- Defensive rendering on optional `paymentLagkassanQrUrl` / `paymentLagkassanLink` so partially configured cups still show something useful.

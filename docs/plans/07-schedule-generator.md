# Plan: Task 07 — Schedule Generator

Implementation plan for `docs/tasks/07-schedule-generator.md`. Approved 2026-04-25, cadence B. Layout: alternating-group slots (Group A = even slots, Group B = odd slots), each round runs both matches in parallel across pitch 1 and pitch 2.

## Files to create

- `src/features/schedule/scheduleTypes.ts` — `Match`, `ScheduleGeneratorInput`, `ScheduleSettingsRequest`.
- `src/features/schedule/scheduleGenerator.ts` — pure deterministic generator returning `Omit<Match, 'id'>[]`.
- `src/features/schedule/scheduleGenerator.test.ts` — 4 tests (count + pairings; 3 plays per team; group/parity invariant; slot spacing).
- `src/features/schedule/scheduleApi.ts` — RTK Query slice (`listMatchesByCup`, `generateSchedule`, `updateMatch`).
- `src/features/schedule/AdminSchedulePage.tsx` — admin builder UI.
- `src/features/schedule/AdminSchedulePage.test.tsx` — 1 test (requirements panel when paid counts ≠ 4+4).

## Files to modify

- `src/mocks/db.ts` — type `matches: Match[]`.
- `src/mocks/handlers.ts` — three new endpoints.
- `src/app/store.ts` + `src/test/render.tsx` — register `scheduleApi`.
- `src/app/routes.tsx` — add `/admin/cups/:id/schedule`.
- `src/features/cups/AdminCupSettingsPage.tsx` — "Schedule" link next to "Manage teams" in edit mode.
- `src/locales/{sv,en}/translation.json` — `admin.schedule.*` keys.

## Iterations (cadence B)

| # | Files | Verify |
|---|---|---|
| 1 | `scheduleTypes.ts`, `scheduleGenerator.ts`, `scheduleGenerator.test.ts` | lint, typecheck, run unit tests |
| 2 | `mocks/db.ts`, `mocks/handlers.ts`, `scheduleApi.ts` | lint, typecheck |
| 3 | `app/store.ts`, `test/render.tsx`, locales × 2 | lint, typecheck |
| 4 | `AdminSchedulePage.tsx`, `app/routes.tsx`, `AdminCupSettingsPage.tsx` (link) | lint, typecheck, dev smoke |
| 5 | `AdminSchedulePage.test.tsx`, final gates (lint/typecheck/test/build) | all green |

## Notes

- Generator is a pure function: input takes `{ id: string }[]` (relaxed from full `Team`), no Date mutation, deterministic ISO timestamps. Server stamps match `id` on persistence.
- Default form values: start = tomorrow 10:00 (local), duration = 15 min, break = 5 min.
- Match rows auto-save on blur (no separate Save button per row).
- Cup status auto-transition: `open|full → scheduled` on first generate; `scheduled|finished` keep their status; `draft` → 422.

# Plan: Task 08 — Public Schedule View

Implementation plan for `docs/tasks/08-public-schedule-view.md`. Approved 2026-04-25, cadence B.

## Files to create

- `src/features/schedule/PublicScheduleView.tsx` — the view (`cupId` prop). Fetches matches + public teams, builds id→name map, groups matches by `startTime`, applies group filter, renders slot rows with side-by-side pitch cells.
- `src/features/schedule/PublicSchedulePage.tsx` — standalone wrapper at `/c/:slug/schedule`. Reads cup from outlet context, renders header (Back to cup link + title) + `<PublicScheduleView cupId={cup.id} />`.
- `src/features/schedule/PublicScheduleView.test.tsx` — 1 test (matches grouped by slot + Group A filter narrows the list).

## Files to modify

- `src/features/cups/PublicCupLandingPage.tsx` — Schedule tab swaps placeholder for `<PublicScheduleView cupId={cup.id} />`.
- `src/app/routes.tsx` — `/c/:slug/schedule` swaps `ComingSoon` for `<PublicSchedulePage />`.
- `src/locales/{sv,en}/translation.json` — `public.schedule.*` keys.

## Iterations

| # | Files | Verify |
|---|---|---|
| 1 | locales × 2 + `PublicScheduleView.tsx` | lint, typecheck |
| 2 | `PublicSchedulePage.tsx` + `routes.tsx` + `PublicCupLandingPage.tsx` (tab swap) | lint, typecheck, dev smoke |
| 3 | `PublicScheduleView.test.tsx` + final gates | test:once, build |

## Notes

- Empty state when `matches.length === 0` (cup not scheduled).
- Empty-for-filter state when group filter narrows everything out.
- Slot keys are ISO strings → sort lexicographically = chronological.
- Time format via `Intl.DateTimeFormat` in resolved language.
- Mobile-first: pitch cells stack on `< sm`, two columns on `sm+`.

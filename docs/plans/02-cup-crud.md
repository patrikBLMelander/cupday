# Plan: Task 02 — Cup CRUD

Implementation plan for `docs/tasks/02-cup-crud.md`. Approved 2026-04-25, cadence B.

## Files to create

- `src/features/cups/cupTypes.ts` — `Cup`, `CupStatus`, `CupCreateRequest`, `CupUpdateRequest`.
- `src/features/cups/cupsApi.ts` — RTK Query slice; tags `Cups` (list) + `Cup` (per id).
- `src/features/cups/AdminCupListPage.tsx`
- `src/features/cups/AdminCupSettingsPage.tsx`
- `src/features/cups/CupStatusBadge.tsx`
- `src/lib/slug.ts`
- `src/lib/color.ts`
- 5 test files

## Files to modify

- `src/app/store.ts` — register `cupsApi`.
- `src/test/render.tsx` — register `cupsApi` in the test store.
- `src/app/routes.tsx` — replace inline `AdminWelcome` with `AdminCupListPage`; add `cups/new` and `cups/:id` under the AdminLayout.
- `src/mocks/handlers.ts` — extract `requireAuth` helper; add 5 admin cup endpoints + 1 public by-slug endpoint.
- `src/mocks/db.ts` — type `cups` as `Cup[]`.
- `src/locales/{sv,en}/translation.json` — `admin.cups.*`, `admin.cup.*`, `admin.cupForm.*`, `admin.cupStatus.*`.

## CLI step

`npx shadcn@latest add textarea badge --yes`

## Settings form approach

Single `useState<FormShape>` + `update<K>(key, value)` helper. Errors in a parallel `Errors` object. `slugDirtyRef = useRef(false)` so name-change auto-fills slug only until the user edits it.

## Iterations

| # | Files | Verify |
|---|---|---|
| 1 | `cupTypes.ts`, `mocks/db.ts`, `mocks/handlers.ts` (extract `requireAuth` + add 6 cup endpoints) | lint, typecheck |
| 2 | `lib/slug.ts`, `lib/color.ts`, `cupsApi.ts` | lint, typecheck |
| 3 | `app/store.ts`, `test/render.tsx`, locales × 2 + shadcn add | lint |
| 4 | `CupStatusBadge.tsx`, `AdminCupListPage.tsx`, `app/routes.tsx` (list route only) | lint, typecheck |
| 5 | `AdminCupSettingsPage.tsx` + add settings routes to `routes.tsx` | lint, typecheck, dev smoke |
| 6 | 5 test files | `test:once` |

Final gate: lint, typecheck, test:once, build, dev smoke, diff scan.

## Tests

| File | Count |
|---|---|
| `lib/slug.test.ts` | 2 |
| `lib/color.test.ts` | 1 |
| `features/cups/cupsApi.test.ts` | 1 |
| `features/cups/AdminCupListPage.test.tsx` | 1 |
| `features/cups/AdminCupSettingsPage.test.tsx` | 1 |

(Trimmed from 7 to 6 — UI success path is already covered by the cupsApi integration test.)

## Risks

- Slug 409 must surface as field-level error on `slug`.
- `useGetCupQuery` only runs in edit mode — use `skipToken` to skip cleanly.
- `renderWithProviders` test store must include `cupsApi` reducer + middleware.
- shadcn `badge` co-exports `badgeVariants` → same lint warning as `button`. Accept.

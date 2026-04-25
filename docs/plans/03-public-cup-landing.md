# Plan: Task 03 — Public Cup Landing

Implementation plan for `docs/tasks/03-public-cup-landing.md`. Approved 2026-04-25, cadence B.

## Files to create

- `src/app/layouts/PublicLayout.tsx` — fetches cup via `useGetCupBySlugQuery(slug ?? skipToken)`, applies theming via CSS-var overrides on the wrapper, public header (cup-name link + `LanguageSwitcher`). Re-exports a `PublicCupOutletContext = { cup: Cup }` type for child routes. Renders `CupNotFoundPage` on 404.
- `src/features/cups/PublicCupLandingPage.tsx` — three-tab layout (`Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`). Reads cup from `useOutletContext<PublicCupOutletContext>()`. Info tab is the only populated one; Teams + Schedule tabs are empty-state placeholders.
- `src/features/cups/CupNotFoundPage.tsx` — minimal 404 with a link back to `/`.
- 2 test files.

## Files to modify

- `src/app/routes.tsx` — add `/c/:slug` branch with `PublicLayout` + child routes (index landing, plus stubs for `register`, `payment/:registrationId`, `schedule` rendering a small inline `ComingSoon`). Re-add the `/* eslint-disable react-refresh/only-export-components */` since `ComingSoon` is inline.
- `src/locales/{sv,en}/translation.json` — `public.*` keys.

## CLI step

`npx shadcn@latest add tabs --yes`

## Theming

Wrapper element on `PublicLayout` sets inline style:
```ts
{ '--primary': cup.organizingClubColors.primary,
  '--accent':  cup.organizingClubColors.accent } as CSSProperties
```
All descendants using Tailwind `bg-primary`/`text-primary`/`accent` etc. inherit the cup's colors. `--primary-foreground` stays at the default near-white.

## Iterations

| # | Files | Verify |
|---|---|---|
| 1 | `npx shadcn add tabs`, `locales/{sv,en}/translation.json` | lint |
| 2 | `PublicLayout.tsx`, `CupNotFoundPage.tsx`, `PublicCupLandingPage.tsx` | lint, typecheck |
| 3 | `app/routes.tsx` (add public branch + stubs) | lint, typecheck, dev smoke |
| 4 | `PublicLayout.test.tsx`, `PublicCupLandingPage.test.tsx` | `test:once` |

Final gate: lint + typecheck + test + build + dev smoke + diff scan.

## Tests

| File | Count |
|---|---|
| `PublicLayout.test.tsx` | 2 (resolves slug → renders cup name; bad slug → 404) |
| `PublicCupLandingPage.test.tsx` | 1 (three tabs render, click Teams switches panel) |

Tests seed via `db.write` directly; public endpoint needs no auth.

## Risks

- `useGetCupBySlugQuery` accepts a string; pass `skipToken` when slug is missing.
- shadcn `tabs` lands additional Radix dependencies — verify they install cleanly.
- Inline `ComingSoon` re-introduces the `react-refresh` warning in `routes.tsx`; keep the file-level disable.
- Seeding via `db.write` bypasses the network layer; the `getCupBySlug` MSW handler reads from the same db, so the test sees the seeded cup.

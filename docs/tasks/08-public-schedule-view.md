# Task 08 — Public Schedule View

## User Story

As a parent at the field with my phone, I want to open the cup link, jump to the Schedule tab, and instantly see the matches in chronological order with both pitches side by side. I want to filter to just Group A or Group B if my kid's team is in one of them. Sharing `/c/<slug>/schedule` directly should land you on the same view as a standalone page.

## Goal

Populate the public Schedule tab on the cup landing and the standalone `/c/:slug/schedule` route. Both use the same `PublicScheduleView` component. Mobile-first layout, themed with the cup's colors (already applied via `PublicLayout`).

## Scope

1. `PublicScheduleView` component:
   - Fetches `useListMatchesByCupQuery(cup.id)` and `useListPublicTeamsByCupQuery(cup.id)`.
   - Builds a `teamId → name + groupLabel` lookup.
   - Groups matches by `startTime` (the slot key) and renders one row per slot.
   - Each slot row shows the time + the two matches (pitch 1, pitch 2) side by side, stacking on small screens.
   - Each match cell shows: home team, vs, away team, group badge, pitch label.
   - Filter chips: **All / Group A / Group B**. State is local to the component; defaults to All.
   - Empty state when no matches exist (cup not scheduled yet).
2. `PublicSchedulePage` standalone wrapper at `/c/:slug/schedule`:
   - Header with "Back to cup" link.
   - Renders the `PublicScheduleView` inside a single column.
3. Replace the placeholder Schedule tab content on `PublicCupLandingPage` with `<PublicScheduleView />`.
4. Replace the `ComingSoon` stub at `/c/:slug/schedule` with `<PublicSchedulePage />`.

## Out of scope

- Per-team filter (a team chip per team or a team picker). For MVP three group chips is enough; team names are visible inline.
- Live "now playing" highlighting via clock comparison (deferred — easy to add later if desired).
- Score display (Swedish FA rule: no score-keeping for 9-year-olds).
- Schedule print view / PDF export.
- Reorder / drag UI on the public side (admin handles edits).
- Calendar export (.ics).

## Layout

```
[Filter chips]   [All]  [Group A]  [Group B]

10:00            ┌─────────────────────────┐  ┌─────────────────────────┐
                 │ Pitch 1 · Group A       │  │ Pitch 2 · Group A       │
                 │ IFK Lag 1   vs   Lag 2  │  │ Lag 3       vs   Lag 4  │
                 └─────────────────────────┘  └─────────────────────────┘

10:20            ┌─────────────────────────┐  ┌─────────────────────────┐
                 │ Pitch 1 · Group B       │  │ Pitch 2 · Group B       │
                 │ Lag 1       vs   Lag 2  │  │ Lag 3       vs   Lag 4  │
                 └─────────────────────────┘  └─────────────────────────┘
```

On phones (< `sm` breakpoint), match cells stack:
```
10:00
  Pitch 1 · Group A
  IFK Lag 1 vs IFK Lag 2

  Pitch 2 · Group A
  IFK Lag 3 vs IFK Lag 4
```

## Files to create

- `src/features/schedule/PublicScheduleView.tsx` — the embedded view.
- `src/features/schedule/PublicSchedulePage.tsx` — standalone wrapper.
- `src/features/schedule/PublicScheduleView.test.tsx` — 1 test (renders matches grouped by slot; clicking Group A narrows the list).

## Files to modify

- `src/features/cups/PublicCupLandingPage.tsx` — Schedule tab swaps placeholder for `<PublicScheduleView cupId={cup.id} />`.
- `src/app/routes.tsx` — `/c/:slug/schedule` swaps `ComingSoon` for `<PublicSchedulePage />`.
- `src/locales/{sv,en}/translation.json` — `public.schedule.*` keys.

## i18n keys

```
public.schedule: {
  filterAll, filterGroupA, filterGroupB,
  pitchLabel,         // "Pitch {{n}}"
  groupBadge,         // "Group {{label}}"
  vs,
  empty,              // "Schedule not published yet."
  emptyForFilter,     // "No matches in this group."
  backToCup
}
```

## Tests

| File | Count | What |
|---|---|---|
| `PublicScheduleView.test.tsx` | 1 | Seeds a cup + 4 paid teams per group + a matchset; renders the view; asserts the time slot heading is shown for at least one slot AND clicking the "Group A" filter hides Group B matches. |

## Risks / notes

- **Slot grouping** — group matches by `startTime` (ISO string) for stable keys. Sort slot keys lexicographically — ISO-8601 strings sort chronologically.
- **`groupLabel` filter** — local `useState<'all' | 'A' | 'B'>('all')`. After filtering, recompute the slot map; if a slot's matches are all filtered out, hide the slot entirely.
- **Time formatting** — `Intl.DateTimeFormat(lng, { hour: '2-digit', minute: '2-digit' })` in the user's resolved language.
- **Theming** — already inherited from `PublicLayout`. Filter chips and group badges use `bg-primary` etc., which now resolve to the cup's primary color.
- **Component reuse across landing tab + standalone** — `PublicScheduleView` takes `cupId` as a prop (not from outlet context) so the standalone page can pass it from `useOutletContext` and the tab can pass it from the cup it already has. Keeps the component decoupled.
- **No suspense / loading boilerplate beyond a small "Loading…" line** — the queries are fast against MSW and will be fast against Spring later. If anything feels heavy, we can polish later.
- **MSW worker staleness** — usual hard-refresh reminder when iterating in dev.

## Acceptance criteria

- [ ] Schedule tab on `/c/<slug>` shows the published schedule grouped by start time.
- [ ] Each slot displays both pitches, with home/away team names looked up from the public teams endpoint.
- [ ] Group A is rendered in even slots (alternating pattern from the generator), Group B in odd slots.
- [ ] Filter chips switch the visible matches between All / Group A / Group B.
- [ ] When the cup has no matches yet (`status` is not `scheduled`), the empty state is shown.
- [ ] `/c/<slug>/schedule` standalone route renders the same view with a Back-to-cup link.
- [ ] All UI strings via `t()`; sv + en complete.
- [ ] Layout is usable at 360 px width.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:once`, `npm run build` all pass.

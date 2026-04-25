# Task 06 — Admin Teams Management

## User Story

As the organizer, after teams have started registering I want to see them all on a dedicated admin page, mark them as paid once their Lagkassan transfer arrives, cancel any registration when needed, and assign each paid team to either Group A or Group B in preparation for the schedule. Visitors to the public landing should see the participating teams in the "Teams" tab as registrations land.

## Goal

Wire the `/admin/cups/:id/teams` admin page (currently doesn't exist), the supporting endpoints, the public Teams tab population, and a navigation link from cup settings to teams.

## Scope

1. New admin page `AdminTeamsPage` at `/admin/cups/:id/teams`:
   - List all teams for the cup with a status filter (All / Reserved / Paid / Cancelled).
   - Card per team: name, club, contact (name, email, phone), status badge, group label, actions.
   - Actions:
     - **Reserved** → "Mark paid" button (transitions to paid + stamps `paidAt`).
     - **Reserved or paid** → "Cancel" button (`window.confirm` first, then transitions to cancelled + stamps `cancelledAt`).
     - **Paid** → Group dropdown: None / A / B.
2. Group assignment available only for `paid` teams; selecting a group writes `groupLabel`. Clearing it (back to "None") is allowed.
3. Cup status auto-transitions on the server:
   - When team count (reserved+paid) reaches `maxTeams` → cup `open → full`. (Already implemented in Task 04.)
   - When a team is cancelled in a `full` cup and brings the count below `maxTeams` → cup `full → open`. (New here.)
4. Mock admin endpoints (require bearer token):
   - `GET /api/admin/cups/:id/teams` → full `Team[]` for the cup.
   - `PATCH /api/admin/teams/:id` → updates `status` and/or `groupLabel`. Server stamps `paidAt`/`cancelledAt` on the relevant transitions and triggers the `full → open` rebound when applicable.
5. `teamsApi` gains `listAdminTeamsByCup` and `updateTeam` endpoints.
6. Navigation: `AdminCupSettingsPage` gets a "Manage teams" link near the top (visible in edit mode only).
7. Public Teams tab on `PublicCupLandingPage` is populated:
   - List teams grouped by group (A, B, Unassigned).
   - Each row shows team name + status badge ("Reserved" / "Paid").
   - Cancelled teams are excluded server-side in `GET /api/cups/:id/teams` (already true).

## Out of scope

- Drag-and-drop group assignment (using a dropdown is enough for MVP).
- Bulk actions (e.g. cancel multiple, assign all to A).
- Sorting / search beyond the status filter.
- shadcn `alert-dialog` for prettier confirm — using `window.confirm` for now.
- Full-text contact search.
- Re-activating a cancelled team (cancellation is final; the team can re-register if there's room).

## Mock API additions

### `GET /api/admin/cups/:id/teams` (admin, requires auth)

Returns full `Team[]` for the cup, sorted by `createdAt` ascending. 404 if cup missing.

### `PATCH /api/admin/teams/:id` (admin, requires auth)

Body: `{ status?: TeamStatus, groupLabel?: GroupLabel | null }`.

Server logic:
- 404 if team not found.
- If `status` transitions to `paid` → stamp `paidAt = now`, clear `cancelledAt`.
- If `status` transitions to `cancelled` → stamp `cancelledAt = now`. If the cup's status is `full`, recompute the active count (reserved+paid excluding the just-cancelled team) and if it dropped below `maxTeams`, set cup `status = 'open'`.
- If `groupLabel` is provided, write it (allow `null` to clear).
- Returns the updated `Team`.

No validation on group label values beyond the type; UI hides the dropdown for non-paid teams.

## Files to create

- `src/features/teams/AdminTeamsPage.tsx` — the page.
- `src/features/teams/AdminTeamsPage.test.tsx` — 1 small test (renders list + clicks "Mark paid").

## Files to modify

- `src/features/teams/teamsApi.ts` — add `listAdminTeamsByCup`, `updateTeam`. Tag types extend with `'AdminTeams'` (per cup id). `updateTeam` invalidates `AdminTeams`, `Teams`, `Cup`, `Cups`.
- `src/mocks/handlers.ts` — add the two admin endpoints.
- `src/app/routes.tsx` — add `/admin/cups/:id/teams` under the existing AdminLayout branch.
- `src/features/cups/AdminCupSettingsPage.tsx` — when in edit mode, add a "Manage teams" link near the back button.
- `src/features/cups/PublicCupLandingPage.tsx` — populate the Teams tab with grouped team list.
- `src/locales/{sv,en}/translation.json` — `admin.teams.*` and additions to `public.teamsList.*`.
- `src/features/teams/teamsApi.test.ts` — add 1 integration test (mark paid + cancel + cup `full → open` rebound).

## i18n keys

```
admin.teams: {
  title, manageCta,
  filterAll, filterReserved, filterPaid, filterCancelled,
  emptyState,
  columns: { team, club, contact, status, group, actions },
  actions: { markPaid, cancel, confirmCancel },
  groupNone, groupA, groupB,
  reservedCount, paidCount, cancelledCount
}

public.teamsList: {
  groupA, groupB, unassigned,
  reservedBadge, paidBadge,
  empty
}
```

## Tests

| File | Count | What |
|---|---|---|
| `teamsApi.test.ts` | +1 | Mark paid + cancel a paid team in a `full` cup → cup auto-rebound to `open`. |
| `AdminTeamsPage.test.tsx` | 1 | Renders the team list, clicks "Mark paid", asserts the status badge updates. |

The new flow test exercises both transitions and the cup-status side effect in one shot.

## Risks / notes

- **`window.confirm`** is dialog-blocking. Acceptable for MVP — replace with `alert-dialog` when we polish UX.
- **Group dropdown on non-paid teams** — hide rather than disable. A disabled dropdown is noisier and less accessible.
- **Cup-status rebound** runs only when the cup was `full`. If cancelled from any other status (`open`, `scheduled`, `finished`), no transition. We don't roll `scheduled` back to `open` automatically.
- **Public Teams tab** uses the existing `useListPublicTeamsByCupQuery`; the only new code is the rendering. Since the registration mutation already invalidates the `Teams` tag, the tab updates as soon as the organizer marks paid / cancels (via the admin mutation invalidating the same tag).
- **Test seeding** — admin endpoints need an auth token; reuse the established pattern from `cupsApi.test.ts` (login first, then dispatch).
- **MSW worker staleness** — if the user has the dev server up while iterating, the existing service worker may not pick up the new admin handlers without a hard refresh. Same as Task 02.

## Acceptance criteria

- [ ] Visiting `/admin/cups/:id/teams` shows a list of all teams for the cup.
- [ ] Status filter narrows the list to All / Reserved / Paid / Cancelled.
- [ ] "Mark paid" transitions a reserved team to paid and the badge updates without a page reload.
- [ ] "Cancel" prompts via `window.confirm` and transitions the team to cancelled.
- [ ] Cancelling a team in a `full` cup auto-transitions the cup back to `open` (verified via the cup list status badge after invalidation).
- [ ] Group dropdown is visible only for paid teams; selecting A/B/None updates `groupLabel`.
- [ ] Cup settings page has a "Manage teams" link in edit mode.
- [ ] Public landing's Teams tab shows team names grouped by group, with status badges.
- [ ] All UI strings via `t()`; sv + en complete.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:once`, `npm run build` all pass.

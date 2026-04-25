# Task 07 — Schedule Generator

## User Story

As the organizer, once 4 teams are paid in each group, I want to set a start time + match length + break length and click "Generate schedule" — and have the cup's 12 matches laid out across two pitches. I want to fix individual match times or pitches afterwards if reality demands it. The generated schedule transitions the cup to `scheduled` so the public Schedule tab reflects it (Task 08 fills the public side).

## Goal

Wire the schedule generation end-to-end on the admin side: a pure round-robin generator, an admin builder page that exposes settings + previews/edits matches, mock endpoints, and the cup-status auto-transition to `scheduled`. The public Schedule tab consumption is Task 08.

## Scope

1. Pure `scheduleGenerator(input): Match[]` function — deterministic round-robin for 4 teams in each of 2 groups, interleaved across 2 pitches.
2. New mock endpoints:
   - `GET /api/cups/:id/matches` (public, no auth) — returns all matches for the cup ordered by `startTime`.
   - `POST /api/admin/cups/:id/schedule/generate` (admin) — body `{ startTime, matchDurationMinutes, breakBetweenMatchesMinutes }`. Validates 4 paid teams in group A and 4 in group B. Replaces any existing matches for the cup. Transitions cup status to `scheduled` if it was `full` or `open`. Returns the new `Match[]`.
   - `PATCH /api/admin/matches/:id` (admin) — body `{ startTime?, pitch? }`. Returns the updated `Match`.
3. `scheduleApi` RTK Query slice (`listMatchesByCup`, `generateSchedule`, `updateMatch`).
4. `AdminSchedulePage` at `/admin/cups/:id/schedule`:
   - Header with cup name + back to settings.
   - Requirements panel — explains "needs 4 paid teams in each of group A and B"; if not satisfied, the generator form is disabled and the panel shows the current paid-per-group counts with a link to `/admin/cups/:id/teams`.
   - Settings form: start date+time (`<input type="datetime-local">`), match duration (number, default 15), break duration (number, default 5). "Generate schedule" submit.
   - When matches exist, list them sorted by `startTime`. Each row: time + pitch dropdown (1 or 2) + group label + team names. Time is editable via inline `<input type="datetime-local">`; pitch is editable via `<select>`. Auto-saves each field on blur via `updateMatch`. Team names are read-only (re-generate to change them).
5. Settings page gets a "Schedule" link next to "Manage teams" in edit mode.

## Out of scope

- Score entry / standings (Swedish FA rule for 9-year-olds — out of scope per cup-mvp).
- "Lock schedule" button — generation already auto-transitions to `scheduled`, and editing afterwards is allowed.
- Custom group sizes / non-round-robin formats.
- Drag-and-drop schedule editing.
- Conflict detection beyond the generator (e.g. don't warn if the organizer manually puts both teams from the same pair into overlapping slots).
- Public schedule rendering — Task 08.

## Domain types

```ts
type Match = {
  id: string;
  cupId: string;
  groupLabel: 'A' | 'B';
  pitch: 1 | 2;
  startTime: string;     // ISO datetime
  homeTeamId: string;
  awayTeamId: string;
};

type ScheduleGeneratorInput = {
  cupId: string;
  groupATeams: [Team, Team, Team, Team];
  groupBTeams: [Team, Team, Team, Team];
  startTime: Date;
  matchDurationMinutes: number;
  breakBetweenMatchesMinutes: number;
};
```

## Generator algorithm

For 4 teams `[t1, t2, t3, t4]` in a group, the round-robin pairings are deterministic and trivially small:

```
Round 1: (t1 vs t2), (t3 vs t4)
Round 2: (t1 vs t3), (t2 vs t4)
Round 3: (t1 vs t4), (t2 vs t3)
```

→ 3 rounds × 2 matches = 6 matches per group → 12 matches total.

**Layout across pitches and time slots:** 6 time slots, alternating groups. Even slots run a Group A round; odd slots run a Group B round. Within a slot, the round's two matches play in parallel on pitches 1 and 2 (no team plays both pitches in the same slot since round pairings already partition the group's 4 teams).

| Slot | Group | Pitch 1 | Pitch 2 |
|---|---|---|---|
| 0 | A | (A1, A2) | (A3, A4) |
| 1 | B | (B1, B2) | (B3, B4) |
| 2 | A | (A1, A3) | (A2, A4) |
| 3 | B | (B1, B3) | (B2, B4) |
| 4 | A | (A1, A4) | (A2, A3) |
| 5 | B | (B1, B4) | (B2, B3) |

Every Group A team plays slots 0/2/4; every Group B team plays slots 1/3/5. Uniform 1-slot rest between matches for every team. Parents and refs only follow one group at a time.

`slotStart(N) = startTime + N * (matchDurationMinutes + breakBetweenMatchesMinutes) minutes`.

`Match.id` is generated lazily: server-side `crypto.randomUUID()` when persisting. The generator function takes the Team objects and returns `Match`-shaped objects with the home/away ids filled in, but the id field is a placeholder — the server stamps real ids on persistence. Cleanest split: keep the pure function returning `Omit<Match, 'id'>[]` and let the handler add ids.

## Mock API endpoints

### `GET /api/cups/:id/matches` (public)

Returns `Match[]` sorted by `startTime` ascending. 404 if cup missing.

### `POST /api/admin/cups/:id/schedule/generate` (admin, requires auth)

Body:
```ts
{
  startTime: string,        // ISO datetime
  matchDurationMinutes: number,
  breakBetweenMatchesMinutes: number,
}
```

Server logic:
1. Auth + cup exists checks.
2. Compute paid teams in group A and group B.
3. If either group ≠ 4 paid → 422 with detail explaining the requirement.
4. Validate the numeric fields (positive integers, sane caps).
5. Run the generator; stamp `id` and `cupId` on each match.
6. Replace `db.matches` for the cup (filter out old, push new).
7. If `cup.status` is `full` or `open`, transition to `scheduled`. Otherwise leave status alone.
8. Return the new `Match[]`.

### `PATCH /api/admin/matches/:id` (admin)

Body: `{ startTime?: string, pitch?: 1 | 2 }`. Updates the match. Returns the new shape.

## Files to create

- `src/features/schedule/scheduleTypes.ts` — `Match`, generator input/output types.
- `src/features/schedule/scheduleGenerator.ts` — pure function.
- `src/features/schedule/scheduleApi.ts` — RTK Query slice.
- `src/features/schedule/AdminSchedulePage.tsx`
- `src/features/schedule/scheduleGenerator.test.ts` — pure-function tests.
- `src/features/schedule/AdminSchedulePage.test.tsx` — 1 test (renders the requirements panel when paid counts are wrong).

## Files to modify

- `src/mocks/db.ts` — type `matches: Match[]`.
- `src/mocks/handlers.ts` — three new endpoints.
- `src/app/store.ts` — register `scheduleApi`.
- `src/test/render.tsx` — register `scheduleApi` in test store.
- `src/app/routes.tsx` — add `/admin/cups/:id/schedule`.
- `src/features/cups/AdminCupSettingsPage.tsx` — add "Schedule" link next to "Manage teams" (edit mode).
- `src/locales/{sv,en}/translation.json` — `admin.schedule.*` keys.

## i18n keys

```
admin.schedule: {
  title, manageCta, backToSettings,
  requirements: {
    title, body, paidInGroup, currentCounts, manageTeamsLink
  },
  settings: {
    title, startTime, matchDuration, breakDuration, generateCta,
    generateConfirm, regenerateCta
  },
  matchList: {
    title, empty, time, pitch, group, vs, pitchLabel
  },
  status: { scheduled, draft },
  errors: {
    notEnoughTeams, generationFailed, updateFailed
  }
}
```

## Tests

| File | Count | What |
|---|---|---|
| `scheduleGenerator.test.ts` | 4 | (a) produces 12 matches with the expected pairings; (b) every team plays exactly 3 times; (c) Group A teams only appear in even slots and Group B teams only in odd slots; (d) slot timestamps are monotonic and spaced by `duration + break`. |
| `AdminSchedulePage.test.tsx` | 1 | Renders the requirements panel when fewer than 4 paid teams in each group (no Generate button). |

The integration test for `POST /generate` is small enough to add to `scheduleGenerator.test.ts`? No — that needs auth + RTK Query + DB seeding. Skip it for MVP; the unit tests cover the logic, the handler is straightforward, and the page test exercises the requirements gate. Real integration would be E2E (Playwright) later.

## Risks / notes

- **Generator returns tuples without ids** — cleanest is `Omit<Match, 'id'>[]`. The page test will use the pure function; the handler test path goes through the API which assigns ids.
- **Date handling** — `<input type="datetime-local">` value is `YYYY-MM-DDTHH:mm` (no seconds, no zone). `new Date(value)` parses it as local time. Server stamps as ISO. Round-trip is fine across the form.
- **Match list updates after generation** — RTK Query: `generateSchedule` invalidates `Matches` (the new tag) so the list re-renders. PATCHing a single match also invalidates `Matches` so the list refreshes (cheap for ≤ 12 matches; we don't bother with optimistic updates).
- **Auto-transition to `scheduled`** — only from `full` or `open`. From `scheduled`, re-generation overwrites without changing status. From `finished`, refuse generation? For MVP, allow regen (organizer might fix mistakes after the cup ends and re-publish for archival accuracy). 422 on `draft` (registration not even open yet — generator doesn't make sense).
- **Cancel/refund effects** — if a paid team is cancelled after the schedule is generated, matches still reference their team id. The team rows still exist (status = cancelled), so name lookup works. The schedule will display matches with cancelled teams. The organizer is expected to re-generate before play. Document this caveat in the matchList section copy.

## Acceptance criteria

- [ ] `/admin/cups/:id/schedule` reachable from cup settings ("Schedule" link, edit mode only).
- [ ] When paid teams per group are not exactly 4 + 4, the requirements panel explains the gap and the Generate button is hidden.
- [ ] When the requirement is met, the form is enabled with default values (start = tomorrow 10:00 cup-tz, duration = 15 min, break = 5 min).
- [ ] Generating creates 12 matches across 2 pitches and transitions the cup to `scheduled`.
- [ ] Generated matches list is sorted by start time.
- [ ] Each match row shows time, pitch, group label, "home vs away" team names.
- [ ] Time and pitch are editable on each match row; changes persist on blur.
- [ ] All UI strings via `t()`; sv + en complete.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:once`, `npm run build` all pass.

# Task BE-06 — Schedule

## User Story

As the organizer, once 4 teams are paid in each group, I want to set a start time + match length + break length and click "Generate schedule" — the backend lays out the 12-match round-robin across two pitches, transitions the cup to `scheduled`, and the public Schedule tab on the cup landing immediately reflects it. I can fix individual match times or pitches afterwards if reality demands it.

## Goal

Implement the schedule surface end-to-end: a pure round-robin generator, persistence under a `match` table, three endpoints (public list, admin generate, admin update), and the `open|full → scheduled` auto-transition. After this task the entire MVP backend contract is implemented and the frontend can swap from MSW to the real backend.

## Scope

1. `match` table via Flyway `V5__match.sql`. FK to `cup` is `ON DELETE CASCADE` so cup deletion cleans up matches; FKs to `team` are `ON DELETE CASCADE` for the same reason.
2. `Match` JPA entity + `MatchRepository`.
3. Pure `ScheduleGenerator` — port of `frontend/src/features/schedule/scheduleGenerator.ts`. Returns `List<MatchSpec>` (no IDs); the service stamps UUIDs when persisting.
4. `ScheduleService` — owns the generate / update flow with a pessimistic write lock on the cup row. Validates settings, requires 4 paid teams per group, replaces existing matches, transitions cup status.
5. `AdminScheduleController` — `POST /api/admin/cups/{cupId}/schedule/generate` and `PATCH /api/admin/matches/{id}`.
6. `PublicScheduleController` — `GET /api/cups/{cupId}/matches`.
7. New exceptions: `MatchNotFoundException` (→ 404), `InsufficientPaidTeamsException` (→ 422), `CupNotReadyException` (→ 422). Update `GlobalExceptionHandler`.
8. New `TeamRepository` query: `findByCupIdAndStatusAndGroupLabel(...)` for selecting the eligible group rosters.

## Out of scope

- Score entry / standings — never (Swedish FA rule).
- Rescheduling beyond `startTime` and `pitch` (no team swaps; re-generate to change them).
- Bracket / knockout formats. MVP is round-robin only.
- Match-level concurrency control. Schedule-edit collisions are rare (one organizer); pessimistic-lock the cup during generation only.
- Cancellation of an individual match. The generator owns the schedule shape; `DELETE` not exposed.
- Unwinding the cup status from `scheduled` back to `open`/`full`. One-way transition for MVP.

## Domain & schema

```sql
CREATE TABLE match (
  id UUID PRIMARY KEY,
  cup_id UUID NOT NULL REFERENCES cup(id) ON DELETE CASCADE,
  group_label TEXT NOT NULL CHECK (group_label IN ('A', 'B')),
  pitch SMALLINT NOT NULL CHECK (pitch IN (1, 2)),
  start_time TIMESTAMPTZ NOT NULL,
  home_team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE
);

CREATE INDEX ix_match_cup_id ON match (cup_id);
CREATE INDEX ix_match_cup_id_start_time ON match (cup_id, start_time);
```

The Java entity uses `@DynamicUpdate` so PATCH only writes dirty columns.

## Schedule generator algorithm

Mirror of `frontend/src/features/schedule/scheduleGenerator.ts`. Six time slots, alternating groups: even slots run a Group A round (both matches in parallel on pitches 1 and 2); odd slots run a Group B round.

Round-robin pairings for 4 teams `[t0, t1, t2, t3]`:

| Round | Match 1 (pitch 1) | Match 2 (pitch 2) |
|---|---|---|
| 1 | t0 vs t1 | t2 vs t3 |
| 2 | t0 vs t2 | t1 vs t3 |
| 3 | t0 vs t3 | t1 vs t2 |

Slot layout:

| Slot | Group | Round |
|---|---|---|
| 0 | A | 1 |
| 1 | B | 1 |
| 2 | A | 2 |
| 3 | B | 2 |
| 4 | A | 3 |
| 5 | B | 3 |

`slotStart(N) = startTime + N * (matchDurationMinutes + breakBetweenMatchesMinutes) minutes`.

Result: 12 matches. Every team plays exactly 3 with a uniform 1-slot rest between matches.

The Java implementation should be a pure static function (`ScheduleGenerator.generate(...)`) covered by JUnit unit tests mirroring the TS test cases. It returns `List<MatchSpec>` (id-less). The service adds IDs when calling `matchRepository.saveAll(...)`.

## API contract

### `GET /api/cups/{cupId}/matches` (public)

Returns `List<MatchResponse>` ordered by `startTime` asc. 404 if cup missing.

```json
[
  {
    "id": "uuid", "cupId": "uuid", "groupLabel": "A", "pitch": 1,
    "startTime": "2026-06-01T08:00:00Z",
    "homeTeamId": "uuid", "awayTeamId": "uuid"
  },
  ...
]
```

### `POST /api/admin/cups/{cupId}/schedule/generate` (admin)

Body:
```json
{
  "startTime": "2026-06-01T08:00:00Z",
  "matchDurationMinutes": 15,
  "breakBetweenMatchesMinutes": 5
}
```

Validation:
- 404 if cup missing.
- 422 (`CupNotReadyException`) if `cup.status == draft`. "Open registrations before generating a schedule."
- 400 if any numeric field is missing/out of range (`matchDurationMinutes` ∈ [1, 120], `breakBetweenMatchesMinutes` ∈ [0, 60]).
- 400 if `startTime` is unparseable.
- 422 (`InsufficientPaidTeamsException`) if either group has ≠ 4 paid teams. Detail: `"Need 4 paid teams in each group (A=N, B=M)"`.

On success:
- Replace all matches for this cup.
- If cup status is `open` or `full`, transition to `scheduled`. Other statuses (`scheduled`, `finished`) are kept — you can re-generate without unwinding.
- Returns 200 with the new `List<MatchResponse>` ordered by `startTime`.

### `PATCH /api/admin/matches/{id}` (admin)

Body: `{ "startTime"?: ISO, "pitch"?: 1 | 2 }`. Both fields optional; absent = no change. JSON null on either is treated as 400 (we don't support clearing).

- 404 if match missing.
- 400 on invalid pitch (`!= 1, 2`) or unparseable `startTime`.

Returns 200 with the updated `MatchResponse`.

## Concurrency

`ScheduleService.generate(...)` runs in `@Transactional` and starts with `cupRepository.findByIdForUpdate(cupId)` to lock the cup row for the duration. Avoids races against:
- Concurrent registrations on the same cup (BE-04 also holds this lock).
- Concurrent admin team patches that might rebound the cup status (BE-05 also holds this lock).

`ScheduleService.updateMatch(...)` doesn't need the lock — it touches one row.

## Files to create

- `backend/src/main/resources/db/migration/V5__match.sql`
- `backend/src/main/java/com/cup/backend/schedule/Match.java`
- `backend/src/main/java/com/cup/backend/schedule/MatchRepository.java`
- `backend/src/main/java/com/cup/backend/schedule/ScheduleGenerator.java`
- `backend/src/main/java/com/cup/backend/schedule/ScheduleDtos.java` — `MatchResponse`, `GenerateScheduleRequest`, `MatchUpdateRequest`.
- `backend/src/main/java/com/cup/backend/schedule/ScheduleService.java`
- `backend/src/main/java/com/cup/backend/schedule/AdminScheduleController.java`
- `backend/src/main/java/com/cup/backend/schedule/PublicScheduleController.java`
- `backend/src/main/java/com/cup/backend/schedule/MatchNotFoundException.java`
- `backend/src/main/java/com/cup/backend/schedule/InsufficientPaidTeamsException.java`
- `backend/src/main/java/com/cup/backend/schedule/CupNotReadyException.java`
- `backend/src/test/java/com/cup/backend/schedule/ScheduleGeneratorTest.java` (unit, 5 cases)
- `backend/src/test/java/com/cup/backend/schedule/AdminScheduleControllerIT.java` (IT, 3 cases)
- `backend/src/test/java/com/cup/backend/schedule/PublicScheduleControllerIT.java` (IT, 1 case)

## Files to modify

- `backend/src/main/java/com/cup/backend/teams/TeamRepository.java` — add `findByCupIdAndStatusAndGroupLabelOrderByCreatedAtAsc(...)`.
- `backend/src/main/java/com/cup/backend/common/GlobalExceptionHandler.java` — handlers for the three new exceptions.

## Tests

| File | Cases |
|---|---|
| `ScheduleGeneratorTest.java` | 5 — 12 matches with the expected pairings; every team plays 3 times; even slots Group A only / odd slots Group B only; slot timestamps spaced by `(duration + break)` minutes; throws when a group ≠ 4 teams. (Mirrors the TS unit tests.) |
| `AdminScheduleControllerIT.java` | 3 — happy path: generate against an `open` cup with 4+4 paid teams returns 12 matches and flips the cup to `scheduled`; rejects with 422 when paid counts ≠ 4+4; rejects with 422 when cup is `draft`. |
| `PublicScheduleControllerIT.java` | 1 — public list returns matches sorted by `startTime` for a scheduled cup, 404 for an unknown cupId (one test, two assertions). |

Total new: 9. Existing 31 + 9 = 40 after this task.

## Risks / notes

- **`match` is a contextual keyword in Java 21** (used in `switch` expressions) — but it's still legal as a class/table name. Hibernate emits `match` quoted/unquoted depending on dialect; Postgres treats it as a regular identifier. No issue.
- **FK cascades from `team`** — if a team is hard-deleted (we don't expose this in MVP, but cascade from `cup` does it indirectly), its matches go too. For an MVP cancellation flow this never triggers since cancellation is a status change, not a row delete.
- **Match-team referential consistency post-cancellation** — since cancel doesn't delete the team row, `home_team_id` / `away_team_id` stay valid for cancelled teams. The schedule UI flags this so the organizer can re-generate.
- **Schedule re-generation overwrites** — replace-all semantics. Match IDs change. If the frontend keeps any cache by `match.id` it will refetch via the cache invalidation already wired in `frontend/src/features/schedule/scheduleApi.ts`.
- **`@DynamicUpdate`** keeps PATCH small. Hibernate only updates the columns we set.
- **Date parsing** — Spring/Jackson handles ISO-8601 `Instant` natively. Bad strings throw `HttpMessageNotReadableException` which the global handler maps to 400.
- **Cup status transition is one-way** in this task. Future "unschedule" feature could add an admin "Reset schedule" endpoint that deletes matches and resets cup to `open` — out of scope.
- **Frontend MSW shape cross-check** — `MatchResponse` matches the frontend's `Match` type exactly (`id, cupId, groupLabel, pitch, startTime, homeTeamId, awayTeamId`). `GenerateScheduleRequest` matches `ScheduleSettingsRequest` from `frontend/src/features/schedule/scheduleTypes.ts`.

## Acceptance criteria

- [ ] `V5__match.sql` applies cleanly; `match` table + indexes + cascades exist.
- [ ] `ScheduleGenerator` produces 12 matches matching the TS shape (verified by 5 unit tests).
- [ ] `POST /api/admin/cups/{cupId}/schedule/generate` returns 12 matches sorted by `startTime` and transitions the cup `open|full → scheduled`.
- [ ] Generation rejects with 422 when paid counts are not exactly 4 + 4.
- [ ] Generation rejects with 422 when cup is `draft`.
- [ ] `PATCH /api/admin/matches/{id}` updates `startTime` and/or `pitch`; returns 404 for unknown id; returns 400 for malformed body.
- [ ] `GET /api/cups/{cupId}/matches` returns matches sorted by `startTime`; 404 if cup missing.
- [ ] All admin endpoints return 401 RFC-7807 without a valid bearer token.
- [ ] `mvn verify` green: 40 tests pass (17 UT + 23 IT).
- [ ] All new code follows `CODE_STANDARD.md`.

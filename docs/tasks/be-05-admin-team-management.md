# Task BE-05 — Admin Team Management

## User Story

As the organizer, I want to see every team registered to my cup (regardless of status), mark reserved teams as paid once payment lands in Lagkassan, cancel teams that drop out, and assign paid teams to Group A or B in preparation for the schedule. When a paid team is cancelled in a `full` cup that drops the active count below `maxTeams`, the cup auto-transitions back to `open`.

## Goal

Implement the admin-facing team management surface end-to-end. Two endpoints (list + patch) backed by a service that handles status stamping, group assignment, and the cup `full → open` rebound atomically under a pessimistic lock.

## Scope

1. New mock endpoints (admin, requires bearer token):
   - `GET /api/admin/cups/{cupId}/teams` — full `Team[]` for the cup, sorted by `createdAt` asc, **including** cancelled teams (admin needs the full picture).
   - `PATCH /api/admin/teams/{id}` — body accepts `status?` and `groupLabel?` (where `groupLabel: null` means clear the assignment, `absent` means leave it). Stamps `paidAt` / `cancelledAt` on the relevant transitions, and auto-transitions the cup back to `open` if a cancellation drops a `full` cup below capacity.
2. `AdminTeamService` — owns the transitions + atomic cup rebound under a pessimistic write lock on the cup row.
3. `AdminTeamController` — the two endpoints.
4. New types in `TeamDtos`: `AdminTeamResponse` (full team data, returned by both endpoints), `TeamUpdateRequest`.
5. New exception: `TeamNotFoundException` → 404.
6. New exception: `InvalidTeamTransitionException` → 422 (used when trying to mutate a cancelled team).
7. Update `GlobalExceptionHandler` for the two new exception types.

## Out of scope

- Hard-deleting teams — cancellation is the lifecycle terminator. Cancelled teams stay in the table; the unique-name index already filters them out so their names are reusable.
- "Uncancelling" a team. Cancellation is final; the user re-registers if they change their mind.
- Bulk operations.
- Admin updates to the contact info of a team. The frontend doesn't expose this; out of scope for MVP.
- Score/standings — never (Swedish FA rule).

## API contract

### `GET /api/admin/cups/{cupId}/teams` (admin)

Returns `AdminTeamResponse[]` — full team data including contact fields, sorted by `createdAt` asc. **Includes** cancelled teams (the admin teams page filters by status; the API gives the unfiltered list).

404 if cup missing.

### `PATCH /api/admin/teams/{id}` (admin)

Body fields are independent — frontend sends one operation at a time:

```json
{ "status": "paid" }                  // mark paid
{ "status": "cancelled" }             // cancel
{ "groupLabel": "A" }                 // assign group A
{ "groupLabel": null }                // clear group assignment
```

Semantics:
- **`status` field**: if present and non-null, transition the team. Stamps `paidAt = now` on `→ paid` (and clears `cancelledAt`); stamps `cancelledAt = now` on `→ cancelled`. Same status as current = no-op (still returns 200).
- **`groupLabel` field**: tri-state.
  - Field absent in JSON → no change.
  - Field present with a value (`"A"` or `"B"`) → set.
  - Field present with `null` → clear (set to `null`).
- **Cup rebound**: if the transition is `→ cancelled` and the cup's status is currently `full`, recompute the active count. If `active < maxTeams`, set `cup.status = open`. The cup row is locked via pessimistic write to serialize against concurrent registrations and other cancellations.

Returns 200 with the updated `AdminTeamResponse`.

Validation:
- 404 if team missing.
- 422 if the team is currently `cancelled` and the patch tries to mutate it. Cancellation is final.
- 400 on malformed body (`MethodArgumentNotValidException` already covered by the global handler).

## Distinguishing absent vs null in PATCH

Java records can't natively tell "field absent" from "field null" — both come through as `null`. The frontend genuinely distinguishes the two:
- `{ status: "paid" }` should NOT clear the group assignment.
- `{ groupLabel: null }` SHOULD clear the group assignment.

Solution: declare `groupLabel` as `Optional<GroupLabel>` in the request record. Spring Boot's auto-registered `Jackson Jdk8Module` deserializes:
- absent JSON → `groupLabel = null` (the Optional itself is null)
- explicit `null` → `groupLabel = Optional.empty()`
- value → `groupLabel = Optional.of(value)`

Service inspects:
```java
if (req.groupLabel() != null) {
  team.setGroupLabel(req.groupLabel().orElse(null));  // empty = clear, present = set
}
```

`status` stays as plain `TeamStatus?` (null = absent or no change). The frontend only ever sends a non-null status when it wants to transition.

## Concurrency

`AdminTeamService.updateTeam(...)` runs inside `@Transactional`. If the patch transitions the team to `cancelled`, the service locks the cup row via `cupRepository.findByIdForUpdate(team.getCupId())` BEFORE applying the team change. Holding the lock for the full transaction ensures the rebound check and cup-status write race-cleanly against:
- Concurrent registrations on the same cup (BE-04 already locks the cup during registration).
- Concurrent cancellations on the same cup (each waits for the lock).

Other cups are unaffected.

For `paid` and group-only updates, no cup lock is needed (no rebound possible).

## Files to create

- `backend/src/main/java/com/cup/backend/teams/AdminTeamService.java`
- `backend/src/main/java/com/cup/backend/teams/AdminTeamController.java`
- `backend/src/main/java/com/cup/backend/teams/TeamNotFoundException.java`
- `backend/src/main/java/com/cup/backend/teams/InvalidTeamTransitionException.java`
- `backend/src/test/java/com/cup/backend/teams/AdminTeamServiceTest.java`
- `backend/src/test/java/com/cup/backend/teams/AdminTeamControllerIT.java`

## Files to modify

- `backend/src/main/java/com/cup/backend/teams/TeamDtos.java` — add `AdminTeamResponse` and `TeamUpdateRequest`.
- `backend/src/main/java/com/cup/backend/teams/TeamRepository.java` — add `findByCupIdOrderByCreatedAtAsc(UUID cupId)` (returns ALL teams, not just active).
- `backend/src/main/java/com/cup/backend/common/GlobalExceptionHandler.java` — handlers for `TeamNotFoundException` (404) and `InvalidTeamTransitionException` (422).

## Tests

| File | Cases |
|---|---|
| `AdminTeamServiceTest.java` | 4 — mark paid stamps `paidAt`; cancel stamps `cancelledAt` + flips full→open when capacity drops; group assignment writes the label; cancelled team cannot be modified (`InvalidTeamTransitionException`). Mocks `CupRepository` and `TeamRepository`. |
| `AdminTeamControllerIT.java` | 4 — list returns all teams (including cancelled); mark paid round-trip + paidAt set; cancel in full cup auto-rebounds cup to open; PATCH without auth returns 401. |

Total new: 8. Existing 23 + 8 = 31 after this task.

## Risks / notes

- **Optional<GroupLabel> tri-state** — verified by an IT case that sends `{"groupLabel": null}` and asserts the column was cleared. If Jackson's behavior surprises us on the actual run we'll fall back to `Map<String, Object>` for the body and inspect via `containsKey`.
- **Cancelling a team with a group assignment** — the assignment stays on the row (we don't clear it on cancel). Cancelled teams aren't shown in the public team list anyway.
- **Re-paying a cancelled team is rejected** — keeps the schema invariants tight (the partial unique index could fail if two teams share a name and one was cancelled).
- **`maxTeams` reduction race** — admin can edit `maxTeams` via cup PATCH (BE-03). If they reduce it below the current active count and then a team is cancelled, the rebound check uses the *current* `maxTeams` so it correctly stays full. Edge case but covered.
- **`paidAt` not cleared on later cancel** — once paid, the timestamp is historical. Cancellation just sets `cancelledAt`. Both can be non-null on a paid-then-cancelled team.
- **Frontend MSW shape cross-check** — `AdminTeamResponse` matches the frontend's `Team` type exactly (including all contact fields and the timestamp triple).

## Acceptance criteria

- [ ] `GET /api/admin/cups/{cupId}/teams` returns all teams (including cancelled) sorted by `createdAt`, with 401 if unauth and 404 if cup missing.
- [ ] `PATCH /api/admin/teams/{id}` with `{"status":"paid"}` transitions the team and stamps `paidAt`.
- [ ] `PATCH` with `{"status":"cancelled"}` stamps `cancelledAt` and flips a `full` cup back to `open` when capacity drops.
- [ ] `PATCH` with `{"groupLabel":"A"}` sets the group; with `{"groupLabel":null}` clears it; with the field absent leaves it untouched.
- [ ] `PATCH` on a cancelled team returns 422 with the new `InvalidTeamTransitionException` mapping.
- [ ] `PATCH` without auth returns 401.
- [ ] `mvn verify` green: 31 tests pass (13 UT + 18 IT).
- [ ] All new code follows `CODE_STANDARD.md`.

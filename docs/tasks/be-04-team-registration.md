# Task BE-04 — Team Registration

## User Story

Anyone with a cup link can open `/c/<slug>/register`, fill in the form, and submit. The backend creates 1 or 2 `Team` rows in `reserved` status under a single `Registration`, returns the registration id, and auto-flips the cup to `full` if the new active count hits `maxTeams`. The frontend's existing flow already speaks this contract via MSW.

## Goal

Implement the team-registration surface end-to-end against Postgres-backed `team` and `registration` tables. Three public endpoints, atomic cup-status transition, idiomatic 4xx responses for validation / not-open / full / name-conflict.

## Scope

1. `team` and `registration` tables via Flyway `V4__teams_and_registrations.sql`. Includes a partial unique index on `(cup_id, lower(name)) WHERE status != 'cancelled'` so cancelled team names free up automatically. FK to `cup` is `ON DELETE CASCADE` so deleting a cup cleans up its teams + registrations.
2. `Team` and `Registration` JPA entities, `TeamStatus` and `GroupLabel` enums (lowercase JSON same as `CupStatus`).
3. Repositories: `TeamRepository`, `RegistrationRepository`. Pessimistic-lock query on `CupRepository` (`findByIdForUpdate`) to serialize registrations on the same cup.
4. `TeamDtos` — `RegistrationCreateRequest`, `RegistrationCreateResponse`, `RegistrationDetail`, `PublicTeam`.
5. `RegistrationService` — handles validation, name uniqueness, capacity, atomic team insert + optional cup status flip. Pessimistic-lock the cup row at the start of the transaction.
6. `RegistrationController` — `POST /api/cups/{id}/registrations` (public) and `GET /api/registrations/{id}` (public).
7. `PublicTeamController` — `GET /api/cups/{id}/teams` (public, returns `PublicTeam[]` excluding cancelled).
8. New exceptions: `CupNotOpenException` (→ 422), `CupFullException` (→ 422), `TeamNameConflictException` (→ 409 with `teamName` extension), `RegistrationNotFoundException` (→ 404).
9. Extend `GlobalExceptionHandler` with the new mappings.

## Out of scope

- Admin team management (mark paid / cancel / group assign) — BE-05.
- Score / standings — never (Swedish FA rule).
- Email confirmations.
- CAPTCHA.
- Reactivating cancelled teams.
- The cup `full → open` rebound on cancellation — that's BE-05's job (cancellation lives there).

## Domain & schema

```sql
CREATE TABLE registration (
  id UUID PRIMARY KEY,
  cup_id UUID NOT NULL REFERENCES cup(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_registration_cup_id ON registration (cup_id);

CREATE TABLE team (
  id UUID PRIMARY KEY,
  cup_id UUID NOT NULL REFERENCES cup(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registration(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  club_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  group_label TEXT CHECK (group_label IN ('A', 'B')),  -- nullable until paid + assigned
  status TEXT NOT NULL CHECK (status IN ('RESERVED', 'PAID', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX ix_team_cup_id ON team (cup_id);
CREATE INDEX ix_team_registration_id ON team (registration_id);

-- Partial unique: a cancelled team's name is reusable.
CREATE UNIQUE INDEX uq_team_cup_name_active
  ON team (cup_id, LOWER(name))
  WHERE status != 'CANCELLED';
```

Java enums:
```java
public enum TeamStatus { RESERVED, PAID, CANCELLED; @JsonValue/@JsonCreator (lowercase wire) }
public enum GroupLabel { A, B; @JsonValue/@JsonCreator (uppercase wire — frontend uses "A"/"B") }
```

`GroupLabel` keeps its uppercase wire format (matches the frontend's literal `'A' | 'B'`).

## API contract

### `POST /api/cups/{id}/registrations` (public)

Body:
```json
{
  "clubName": "IFK Test",
  "contactName": "Patrik",
  "contactEmail": "patrik@example.com",
  "contactPhone": "0700000000",
  "teamNames": ["IFK Lag 1", "IFK Lag 2"]
}
```

Validation order (mirrors the MSW handler):

1. Cup exists → else 404.
2. `cup.status == open` → else 422 with `detail = "Registration is not open for this cup"`.
3. `teamNames.size()` is 1 or 2 → else 400.
4. After trim, no team name is empty → else 400.
5. If 2 names, they must differ (case-insensitive) → else 400 with `detail = "Team names must differ"`.
6. Required string fields non-empty + email format → else 400 (Bean Validation does the heavy lifting via `@Valid`).
7. Each name doesn't collide with an existing non-cancelled team in the same cup → else 409 with `teamName` extension and `detail = "The name \"X\" is already taken — add a number or color to keep teams apart"`.
8. Active count + `teamNames.size()` ≤ `cup.maxTeams` → else 422 with `detail = "Cup is full"`.

On success:
- Create one `team` row per name (status `reserved`, `groupLabel = null`).
- Create one `registration` row binding them.
- If post-insert active count == `maxTeams`, set `cup.status = full`.
- All in a single `@Transactional` boundary with a pessimistic write lock on the cup row.

201 response:
```json
{
  "registrationId": "uuid",
  "teamIds": ["uuid", "uuid"]
}
```

### `GET /api/cups/{id}/teams` (public)

Returns `PublicTeam[]` for the cup, excluding `cancelled`, ordered by `createdAt` asc.

```json
[
  { "id": "uuid", "name": "IFK Lag 1", "groupLabel": null, "status": "reserved" },
  { "id": "uuid", "name": "IFK Lag 2", "groupLabel": "A",  "status": "paid" }
]
```

404 if cup missing.

### `GET /api/registrations/{id}` (public)

```json
{
  "registration": { "id": "uuid", "cupId": "uuid", "teamIds": ["..."], "createdAt": "..." },
  "teams": [ { ... PublicTeam ... }, ... ]
}
```

404 if registration missing.

## Concurrency model

`RegistrationService.register(...)` runs inside `@Transactional`. The first thing it does is `cupRepository.findByIdForUpdate(cupId)` which issues `SELECT ... FOR UPDATE` against Postgres, holding the cup row lock for the duration of the transaction. Concurrent registrations on the same cup queue up. Other cups are unaffected.

This is overkill for two simultaneous WhatsApp visitors but correct under any load. Real production would benefit from optimistic + retry; for MVP the row lock is simpler to reason about.

The partial unique index is the actual line of defense against duplicate names — even if two requests bypass the explicit collision check (they can't, given the lock), Postgres rejects the second insert.

## Files to create

- `backend/src/main/resources/db/migration/V4__teams_and_registrations.sql`
- `backend/src/main/java/com/cup/backend/teams/TeamStatus.java`
- `backend/src/main/java/com/cup/backend/teams/GroupLabel.java`
- `backend/src/main/java/com/cup/backend/teams/Team.java`
- `backend/src/main/java/com/cup/backend/teams/Registration.java`
- `backend/src/main/java/com/cup/backend/teams/TeamRepository.java`
- `backend/src/main/java/com/cup/backend/teams/RegistrationRepository.java`
- `backend/src/main/java/com/cup/backend/teams/TeamDtos.java`
- `backend/src/main/java/com/cup/backend/teams/RegistrationService.java`
- `backend/src/main/java/com/cup/backend/teams/RegistrationController.java`
- `backend/src/main/java/com/cup/backend/teams/PublicTeamController.java`
- `backend/src/main/java/com/cup/backend/teams/CupNotOpenException.java`
- `backend/src/main/java/com/cup/backend/teams/CupFullException.java`
- `backend/src/main/java/com/cup/backend/teams/TeamNameConflictException.java`
- `backend/src/main/java/com/cup/backend/teams/RegistrationNotFoundException.java`
- `backend/src/test/java/com/cup/backend/teams/RegistrationServiceTest.java`
- `backend/src/test/java/com/cup/backend/teams/RegistrationControllerIT.java`

## Files to modify

- `backend/src/main/java/com/cup/backend/cups/CupRepository.java` — add `findByIdForUpdate(UUID)` with `@Lock(LockModeType.PESSIMISTIC_WRITE)`.
- `backend/src/main/java/com/cup/backend/common/GlobalExceptionHandler.java` — add handlers for the four new exceptions.

## Tests

| File | Cases |
|---|---|
| `RegistrationServiceTest.java` | 3 — happy path on an open cup with capacity; cup-not-open throws; name collision throws (uses Mockito-mocked repos). |
| `RegistrationControllerIT.java` | 4 — happy path 201 with body shape; collision returns 409 with `teamName` extension; full cup returns 422; cup auto-transitions to `full` when capacity hits (asserted via `CupRepository`). |

Total new: 7. Existing 16 + 7 = 23 after this task.

The IT seeds an `open` cup directly via `CupRepository` (no auth needed for these public endpoints; admin cup CRUD is irrelevant to the registration flow being tested).

## Risks / notes

- **Pessimistic lock behavior under PostgreSQL** — `SELECT ... FOR UPDATE` blocks competing readers that also use `FOR UPDATE`. Other reads (e.g. `GET /api/cups/by-slug/...`) don't lock, so they aren't blocked.
- **Test concurrency for the lock path** — verifying the lock actually serializes is hard without async. Skipping the concurrency test in MVP; the partial unique index is the safety net.
- **`registration.team_ids`** is *not* stored on the registration row. Teams have `registration_id`. The `RegistrationDetail` response derives `teamIds` from `teamRepository.findByRegistrationId(...)`. Keeps the schema simple.
- **`group_label` JSON wire format** — uppercase. Mismatch from the lowercase `status` is intentional (frontend literal types `'A' | 'B'` for groups, `'reserved' | 'paid' | 'cancelled'` for status).
- **`paid_at` and `cancelled_at`** are written by BE-05 (admin team management), not here. Schema includes the columns now to avoid two migrations against the same table.
- **`@DynamicUpdate` on Team** — same justification as Cup; PATCH-style updates land in BE-05.
- **No team-level `@Version`** — BE-05's status transitions don't race in the same way registration does. Skip optimistic locking on Team unless a real conflict shows up.
- **Frontend MSW shape cross-check** — `RegistrationCreateResponse` is `{ registrationId, teamIds }`. `RegistrationDetail` is `{ registration: { id, cupId, teamIds, createdAt }, teams: PublicTeam[] }`. `PublicTeam` is `{ id, name, groupLabel, status }`. All matches `frontend/src/features/teams/teamTypes.ts`.

## Acceptance criteria

- [ ] `V4__teams_and_registrations.sql` applies cleanly; both tables + the partial unique index exist.
- [ ] `POST /api/cups/{id}/registrations` returns 201 `{ registrationId, teamIds }` on success.
- [ ] All listed validation paths return the documented status code + RFC-7807 detail (with `teamName` extension on 409).
- [ ] After a registration that hits `maxTeams`, the cup row's status flips to `full` in the same transaction.
- [ ] Two concurrent registrations on the same cup serialize via the pessimistic lock; one wins, the loser sees the post-lock state and may legitimately fail capacity if the cup filled.
- [ ] `GET /api/cups/{id}/teams` returns `PublicTeam[]` excluding cancelled teams.
- [ ] `GET /api/registrations/{id}` returns `{ registration, teams }` or 404.
- [ ] `mvn verify` green: 23 tests pass (9 UT + 14 IT).
- [ ] All new code follows `CODE_STANDARD.md`.

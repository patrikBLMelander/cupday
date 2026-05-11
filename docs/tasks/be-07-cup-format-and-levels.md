# Task BE-07 — Cup Format Fields, Levels, Public List & Free Spots

## User Story

As Matchdag's product, the cup card on the landing page needs to show the format (5v5/7v7/9v9), the price, free spots remaining, and (when the organizer opts in) skill levels per team. Organizers configure the format and optional levels when creating the cup; visitors pick a level per team during registration when the cup uses them. A public list endpoint feeds the landing page.

## Goal

Extend the cup contract with the four new fields the frontend landing page needs (`playersPerTeam`, `clubLogoUrl`, `useLevels`, `levels`), expose a derived `activeTeamCount` on every cup response, add `team.level` capture during registration, and ship a public list endpoint scoped to non-draft cups.

## Scope

1. `V6__cup_format_and_levels.sql` migration adding columns to `cup` and `team`.
2. `Cup` entity gains `playersPerTeam`, `clubLogoUrl`, `useLevels`, `levels` (stored as comma-separated TEXT, exposed as `List<String>` over the wire).
3. `Team` entity gains nullable `level: String`.
4. `CupResponse` adds the four new fields **and** a derived `activeTeamCount` (count of `reserved + paid` teams for the cup). All existing endpoints that return `CupResponse` (admin list/get/by-slug) include it.
5. New `GET /api/cups/public` (no auth) — returns `CupResponse[]` for cups with status ≠ `draft`, sorted by `startDate` asc.
6. `RegistrationCreateRequest` adds an optional parallel `teamLevels: List<String>` array. Validation:
   - When `cup.useLevels = true`: `teamLevels` is required, must match `teamNames.length`, every value must be in `cup.levels` (case-sensitive, exact match after trim).
   - When `cup.useLevels = false`: `teamLevels` is ignored.
7. `Team.level` is set from the matching index of `teamLevels` during registration.
8. `PublicTeam` and `AdminTeamResponse` add `level: String?`.
9. Validation rules for the new cup fields:
   - `playersPerTeam` in `{5, 7, 9}` (DB `CHECK`, plus Bean Validation in DTO).
   - `clubLogoUrl` optional, max 2048 chars; if non-blank, must be a valid `http(s)` URL.
   - `levels` (when `useLevels` is true): non-empty after parse, each entry trimmed non-blank, **no commas** within a level name (storage uses comma as separator), max 8 entries.
   - When `useLevels` is false on PATCH, `levels` is ignored and the column reset to empty string.

## Out of scope

- Schedule generator changes. `groupLabel` (A | B) stays as the schedule unit. Levels are informational only — they don't drive bracket placement. Future task once the user has run a cup with levels.
- Frontend changes. They live in `fe-09-matchdag-landing.md` (next task).
- Querying cups by criteria (city, format) — we just expose all non-draft cups for MVP. The frontend filters/sorts client-side.
- Pagination — there will be 1–5 cups for the foreseeable future.

## Schema

```sql
-- V6__cup_format_and_levels.sql
ALTER TABLE cup
  ADD COLUMN players_per_team INTEGER NOT NULL DEFAULT 7
    CHECK (players_per_team IN (5, 7, 9)),
  ADD COLUMN club_logo_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN use_levels BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN levels TEXT NOT NULL DEFAULT '';

ALTER TABLE team
  ADD COLUMN level TEXT;

-- The default 7 keeps existing cups valid (most Swedish youth football is 7v7);
-- the organizer can change in the cup settings page once the frontend lands.
```

## DTO updates

### `CupResponse`
```java
record CupResponse(
    UUID id, String slug, String name,
    String organizingClubName, CupColors organizingClubColors,
    LocalDate startDate, LocalDate endDate,
    String venueName,
    int pitchCount, int maxTeams,
    int registrationFeeSek,
    String paymentInstructions, String paymentLagkassanLink, String paymentLagkassanQrUrl,
    String organizerContactName, String organizerContactEmail, String organizerContactPhone,
    CupStatus status,
    Instant createdAt,
    // --- new ---
    int playersPerTeam,
    String clubLogoUrl,
    boolean useLevels,
    List<String> levels,
    int activeTeamCount) {
  // factory takes (Cup, activeTeamCount)
}
```

### `CupCreateRequest` / `CupUpdateRequest`
Both gain:
- `@Min(5) @Max(9) int playersPerTeam` (create) / `Integer playersPerTeam` (update, null = unchanged)
- `String clubLogoUrl` (create + update; empty string = clear)
- `boolean useLevels` (create) / `Boolean useLevels` (update)
- `List<String> levels` (create + update; empty list = clear)

Service validates `playersPerTeam in {5, 7, 9}` (Bean Validation `@Pattern` doesn't fit ints, so a custom check). `levels` is joined with commas before persisting; split on read into `List<String>`.

### `RegistrationCreateRequest`
Gains optional `List<String> teamLevels` (parallel to `teamNames`).

### `PublicTeam` and `AdminTeamResponse`
Both add `String level` (nullable).

## API additions

### `GET /api/cups/public` (no auth)

Returns `CupResponse[]` for cups with `status` ∈ {`open`, `full`, `scheduled`, `finished`}, sorted by `startDate` asc, `name` asc as tiebreaker. Empty array if nothing matches.

Each response includes `activeTeamCount` so the frontend can compute `freeSpots = maxTeams - activeTeamCount`.

### `GET /api/cups/by-slug/{slug}` (existing, unchanged signature)

Now also includes `activeTeamCount` and the four new fields. The frontend Cup type updates accordingly.

### `GET /api/admin/cups`, `GET /api/admin/cups/{id}` (existing, unchanged signatures)

Same — `CupResponse` shape gains the new fields.

### `POST /api/cups/{cupId}/registrations` (existing, body extended)

Body adds optional `teamLevels: string[]`. Validation rules listed in scope.

## Files to create

- `backend/src/main/resources/db/migration/V6__cup_format_and_levels.sql`

## Files to modify

- `backend/src/main/java/com/cup/backend/cups/Cup.java` — add 4 columns, getters/setters.
- `backend/src/main/java/com/cup/backend/cups/CupDtos.java` — extend `CupResponse`, `CupCreateRequest`, `CupUpdateRequest`.
- `backend/src/main/java/com/cup/backend/cups/CupService.java` — `playersPerTeam` validation, `levels` join/split, `activeTeamCount` derivation. New `listPublic()` method.
- `backend/src/main/java/com/cup/backend/cups/PublicCupController.java` — new `GET /api/cups/public` endpoint (lives next to the existing by-slug).
- `backend/src/main/java/com/cup/backend/cups/CupController.java` — service now takes/returns the new shape; controller passes through.
- `backend/src/main/java/com/cup/backend/teams/Team.java` — add `level` column, getter/setter.
- `backend/src/main/java/com/cup/backend/teams/TeamDtos.java` — `RegistrationCreateRequest` adds `teamLevels`; `PublicTeam` and `AdminTeamResponse` add `level`.
- `backend/src/main/java/com/cup/backend/teams/RegistrationService.java` — validate + persist `teamLevels`.
- `backend/src/main/java/com/cup/backend/teams/TeamRepository.java` — no new methods, but reuse `countActiveByCupId` from the cup service.
- 1–2 existing test files updated to cover the new fields; new IT for the public list endpoint.

## Tests

| File | Cases |
|---|---|
| `CupServiceTest.java` (existing) | +1 — `playersPerTeam` validation rejects values outside `{5, 7, 9}`. |
| `CupControllerIT.java` (existing) | +1 — cup response now includes `activeTeamCount` (verify it's 0 on a fresh cup). |
| `PublicCupControllerIT.java` (existing) | +1 — `GET /api/cups/public` returns sorted non-draft cups; draft cups are excluded. |
| `RegistrationServiceTest.java` (existing) | +2 — happy path with `teamLevels` matching `cup.levels`; rejects when `cup.useLevels=true` and `teamLevels` is missing or contains a value not in `cup.levels`. |

Total new: 5 across existing files (no new test files). Existing 41 + 5 = 46.

## Risks / notes

- **Comma-separated `levels` storage** — the constraint "no commas in level names" is documented in the validation. Frontend's level input should warn if a comma is typed (a small follow-up in FE-09).
- **`activeTeamCount` and N+1** — the public list endpoint runs one count query per cup. With < 5 cups in the foreseeable future, fine. Note as a follow-up: a single grouped query when the cup count grows.
- **Default `playersPerTeam = 7`** — most Swedish youth football is 7v7 between U10 and U12, which is the user's actual case. Existing cups (only the smoke cup so far) inherit this on the migration.
- **Backwards compatibility on the wire** — adding fields to `CupResponse` is additive; the existing frontend (which doesn't know about them yet) will ignore them until FE-09 lands.
- **`teamLevels` as a parallel array** — feels less elegant than a `teams: [{name, level}]` shape, but matches the existing `teamNames: string[]` shape so the registration form refactor is minimal in FE-09.
- **Levels are case-sensitive** — exact-match validation. The frontend passes the level string verbatim (selected from a dropdown populated from `cup.levels`), so case mismatch can't happen via the UI.

## Acceptance criteria

- [ ] `V6` migration applies cleanly on a fresh DB; existing cups (none in the test DB but the smoke cup locally) get the defaults without breaking.
- [ ] `POST /api/admin/cups` accepts and persists `playersPerTeam`, `clubLogoUrl`, `useLevels`, `levels`. `GET` returns them.
- [ ] `playersPerTeam` outside `{5, 7, 9}` returns 400.
- [ ] `levels` containing a value with a comma returns 400.
- [ ] `GET /api/cups/by-slug/{slug}` includes `activeTeamCount` matching the actual count of non-cancelled teams.
- [ ] `GET /api/cups/public` returns non-draft cups sorted by `startDate` asc; excludes draft cups; works without auth.
- [ ] `POST /api/cups/{id}/registrations` with `teamLevels` populated stores `team.level` on each new row.
- [ ] When `cup.useLevels=true`, registrations missing `teamLevels` or with a value not in `cup.levels` return 400.
- [ ] When `cup.useLevels=false`, any `teamLevels` in the request is ignored.
- [ ] `mvn verify` green: 46 tests pass (18 UT + 28 IT — existing 41 + 5 new).
- [ ] All new code follows `CODE_STANDARD.md`.

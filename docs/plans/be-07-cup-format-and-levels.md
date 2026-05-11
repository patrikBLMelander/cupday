# Plan: Task BE-07 — Cup Format Fields, Levels, Public List & Free Spots

Implementation plan for `docs/tasks/be-07-cup-format-and-levels.md`. Approved 2026-05-10, cadence B.

## Files to create

- `backend/src/main/resources/db/migration/V6__cup_format_and_levels.sql`

## Files to modify

- `backend/src/main/java/com/cup/backend/cups/Cup.java` — add 4 columns + getters/setters.
- `backend/src/main/java/com/cup/backend/cups/CupDtos.java` — extend `CupResponse`, `CupCreateRequest`, `CupUpdateRequest`.
- `backend/src/main/java/com/cup/backend/cups/CupService.java` — `playersPerTeam` validation, `levels` join/split, `activeTeamCount` derivation, `listPublic()`.
- `backend/src/main/java/com/cup/backend/cups/CupController.java` — pass `activeTeamCount` when building responses.
- `backend/src/main/java/com/cup/backend/cups/PublicCupController.java` — new `GET /api/cups/public` + activeTeamCount on `getBySlug`.
- `backend/src/main/java/com/cup/backend/cups/CupRepository.java` — add `findByStatusNotOrderByStartDateAscNameAsc(...)` for the public list.
- `backend/src/main/java/com/cup/backend/teams/Team.java` — add `level` column.
- `backend/src/main/java/com/cup/backend/teams/TeamDtos.java` — `RegistrationCreateRequest` adds `teamLevels`; `PublicTeam` and `AdminTeamResponse` add `level`.
- `backend/src/main/java/com/cup/backend/teams/RegistrationService.java` — validate + persist `teamLevels`; expose level in PublicTeam projection.
- 4 existing test files: `CupServiceTest`, `CupControllerIT`, `PublicCupControllerIT`, `RegistrationServiceTest`, `RegistrationControllerIT`.

## Iterations (cadence B)

| # | Files | Verify |
|---|---|---|
| 1 | V6 migration, Cup entity, Team entity | `mvn compile` |
| 2 | CupDtos, TeamDtos | `mvn compile` |
| 3 | CupService, RegistrationService, CupRepository | `mvn compile` |
| 4 | CupController, PublicCupController | `mvn compile` |
| 5 | Test updates (existing fixtures + 5 new cases) + `mvn verify` | green |

## Notes

- `levels` stored as comma-separated TEXT; service handles split/join. No commas in level values (validation).
- Default `playersPerTeam = 7` so existing cups stay valid after migration.
- `CupResponse.from(Cup, int activeTeamCount)` — factory takes count explicitly; controllers fetch it via `teamRepository.countActiveByCupId`.
- Public list endpoint excludes `DRAFT` cups. Sort: `startDate ASC, name ASC`.

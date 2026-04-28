# Plan: Task BE-04 — Team Registration

Implementation plan for `docs/tasks/be-04-team-registration.md`. Approved 2026-04-28, cadence B.

## Files to create

- `backend/src/main/resources/db/migration/V4__teams_and_registrations.sql`
- `backend/src/main/java/com/cup/backend/teams/TeamStatus.java`
- `backend/src/main/java/com/cup/backend/teams/GroupLabel.java`
- `backend/src/main/java/com/cup/backend/teams/Team.java`
- `backend/src/main/java/com/cup/backend/teams/Registration.java`
- `backend/src/main/java/com/cup/backend/teams/TeamRepository.java`
- `backend/src/main/java/com/cup/backend/teams/RegistrationRepository.java`
- `backend/src/main/java/com/cup/backend/teams/TeamDtos.java`
- `backend/src/main/java/com/cup/backend/teams/CupNotOpenException.java`
- `backend/src/main/java/com/cup/backend/teams/CupFullException.java`
- `backend/src/main/java/com/cup/backend/teams/TeamNameConflictException.java`
- `backend/src/main/java/com/cup/backend/teams/RegistrationNotFoundException.java`
- `backend/src/main/java/com/cup/backend/teams/RegistrationService.java`
- `backend/src/main/java/com/cup/backend/teams/RegistrationController.java`
- `backend/src/main/java/com/cup/backend/teams/PublicTeamController.java`
- `backend/src/test/java/com/cup/backend/teams/RegistrationServiceTest.java`
- `backend/src/test/java/com/cup/backend/teams/RegistrationControllerIT.java`

## Files to modify

- `backend/src/main/java/com/cup/backend/cups/CupRepository.java` — add `findByIdForUpdate` with `PESSIMISTIC_WRITE`.
- `backend/src/main/java/com/cup/backend/common/GlobalExceptionHandler.java` — add 4 new `@ExceptionHandler` methods.

## Iterations (cadence B)

| # | Files | Verify |
|---|---|---|
| 1 | V4 migration, TeamStatus, GroupLabel | `mvn compile` |
| 2 | Team, Registration, TeamRepository, RegistrationRepository | `mvn compile` |
| 3 | TeamDtos, 4 exception classes | `mvn compile` |
| 4 | CupRepository (lock), GlobalExceptionHandler (4 handlers), RegistrationService | `mvn compile` |
| 5 | RegistrationController, PublicTeamController | `mvn compile` |
| 6 | RegistrationServiceTest, RegistrationControllerIT + `mvn verify` + diff scan | green |

## Notes

- TeamStatus → lowercase JSON; GroupLabel → uppercase JSON (matches frontend literals).
- Team entity gets `@DynamicUpdate` now (BE-05 needs it for PATCH).
- Service is `@Transactional` and uses `findByIdForUpdate` to serialize cup-scoped registrations.
- The partial unique index on `(cup_id, lower(name)) WHERE status != 'CANCELLED'` is Postgres-specific; tests run against Testcontainers Postgres.

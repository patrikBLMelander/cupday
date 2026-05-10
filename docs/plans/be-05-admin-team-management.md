# Plan: Task BE-05 — Admin Team Management

Implementation plan for `docs/tasks/be-05-admin-team-management.md`. Approved 2026-04-28, cadence B.

## Files to create

- `backend/src/main/java/com/cup/backend/teams/AdminTeamService.java`
- `backend/src/main/java/com/cup/backend/teams/AdminTeamController.java`
- `backend/src/main/java/com/cup/backend/teams/TeamNotFoundException.java`
- `backend/src/main/java/com/cup/backend/teams/InvalidTeamTransitionException.java`
- `backend/src/test/java/com/cup/backend/teams/AdminTeamServiceTest.java`
- `backend/src/test/java/com/cup/backend/teams/AdminTeamControllerIT.java`

## Files to modify

- `backend/src/main/java/com/cup/backend/teams/TeamDtos.java` — add `AdminTeamResponse` and `TeamUpdateRequest`.
- `backend/src/main/java/com/cup/backend/teams/TeamRepository.java` — add `findByCupIdOrderByCreatedAtAsc(UUID)`.
- `backend/src/main/java/com/cup/backend/common/GlobalExceptionHandler.java` — handlers for `TeamNotFoundException` (404) + `InvalidTeamTransitionException` (422).

## Iterations (cadence B)

| # | Files | Verify |
|---|---|---|
| 1 | TeamDtos additions, 2 exceptions, TeamRepository method, GlobalExceptionHandler additions | `mvn compile` |
| 2 | AdminTeamService | `mvn compile` |
| 3 | AdminTeamController | `mvn compile` |
| 4 | 2 test files + `mvn verify` + diff scan | green |

## Notes

- `Optional<GroupLabel>` for the tri-state PATCH semantics, relying on Spring Boot 3's auto-registered `Jdk8Module`.
- Pessimistic cup-row lock only when transitioning to cancelled (rebound check needs serialization).
- Cancelled teams are immutable; modify attempts → 422.

# Plan: Task BE-06 — Schedule

Implementation plan for `docs/tasks/be-06-schedule.md`. Approved 2026-05-10, cadence B.

## Files to create

- `backend/src/main/resources/db/migration/V5__match.sql`
- `backend/src/main/java/com/cup/backend/schedule/Match.java`
- `backend/src/main/java/com/cup/backend/schedule/MatchRepository.java`
- `backend/src/main/java/com/cup/backend/schedule/ScheduleGenerator.java`
- `backend/src/main/java/com/cup/backend/schedule/ScheduleDtos.java`
- `backend/src/main/java/com/cup/backend/schedule/MatchNotFoundException.java`
- `backend/src/main/java/com/cup/backend/schedule/InsufficientPaidTeamsException.java`
- `backend/src/main/java/com/cup/backend/schedule/CupNotReadyException.java`
- `backend/src/main/java/com/cup/backend/schedule/ScheduleService.java`
- `backend/src/main/java/com/cup/backend/schedule/AdminScheduleController.java`
- `backend/src/main/java/com/cup/backend/schedule/PublicScheduleController.java`
- `backend/src/test/java/com/cup/backend/schedule/ScheduleGeneratorTest.java`
- `backend/src/test/java/com/cup/backend/schedule/AdminScheduleControllerIT.java`
- `backend/src/test/java/com/cup/backend/schedule/PublicScheduleControllerIT.java`

## Files to modify

- `backend/src/main/java/com/cup/backend/teams/TeamRepository.java` — add `findByCupIdAndStatusAndGroupLabelOrderByCreatedAtAsc(UUID, TeamStatus, GroupLabel)`.
- `backend/src/main/java/com/cup/backend/common/GlobalExceptionHandler.java` — handlers for the three new exception types.

## Iterations (cadence B)

| # | Files | Verify |
|---|---|---|
| 1 | V5 migration, Match entity, MatchRepository, ScheduleGenerator | `mvn compile` |
| 2 | 3 exceptions, ScheduleDtos, TeamRepository finder, GlobalExceptionHandler | `mvn compile` |
| 3 | ScheduleService | `mvn compile` |
| 4 | AdminScheduleController + PublicScheduleController | `mvn compile` |
| 5 | 3 test files + `mvn verify` + diff scan | green |

## Notes

- `ScheduleGenerator.generate(...)` returns `List<MatchSpec>` (id-less). Service stamps UUIDs at persistence.
- ScheduleService runs in `@Transactional` and locks the cup row via `findByIdForUpdate` for the generation flow only. Match PATCH skips the lock.
- Auto-transition cup status `OPEN | FULL → SCHEDULED`; keep `SCHEDULED` / `FINISHED` unchanged; `DRAFT` rejects.
- Schedule re-generation = delete-by-cupId + insert-all (replace-all).

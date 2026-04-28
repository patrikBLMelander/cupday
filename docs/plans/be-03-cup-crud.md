# Plan: Task BE-03 — Cup CRUD

Implementation plan for `docs/tasks/be-03-cup-crud.md`. Approved 2026-04-28, cadence B.

## Files to create

- `backend/src/main/resources/db/migration/V3__cup.sql`
- `backend/src/main/java/com/cup/backend/cups/CupStatus.java`
- `backend/src/main/java/com/cup/backend/cups/Cup.java`
- `backend/src/main/java/com/cup/backend/cups/CupRepository.java`
- `backend/src/main/java/com/cup/backend/cups/CupNotFoundException.java`
- `backend/src/main/java/com/cup/backend/cups/SlugConflictException.java`
- `backend/src/main/java/com/cup/backend/cups/CupDtos.java`
- `backend/src/main/java/com/cup/backend/cups/CupService.java`
- `backend/src/main/java/com/cup/backend/common/GlobalExceptionHandler.java`
- `backend/src/main/java/com/cup/backend/cups/CupController.java`
- `backend/src/main/java/com/cup/backend/cups/PublicCupController.java`
- `backend/src/test/java/com/cup/backend/cups/CupServiceTest.java`
- `backend/src/test/java/com/cup/backend/cups/CupControllerIT.java`
- `backend/src/test/java/com/cup/backend/cups/PublicCupControllerIT.java`

## Files to modify

- None.

## Iterations (cadence B)

| # | Files | Verify |
|---|---|---|
| 1 | `V3__cup.sql`, `CupStatus.java`, `Cup.java`, `CupRepository.java` | `mvn -B -ntp compile` |
| 2 | `CupNotFoundException.java`, `SlugConflictException.java`, `CupDtos.java`, `CupService.java` | `mvn -B -ntp compile` |
| 3 | `GlobalExceptionHandler.java`, `CupController.java`, `PublicCupController.java` | `mvn -B -ntp compile` |
| 4 | 3 test files + `mvn -B -ntp verify` + diff scan | green |

## Notes

- `@Enumerated(EnumType.STRING)` for DB; `@JsonValue` / `@JsonCreator` on `CupStatus` for lowercase JSON.
- `@Version` for optimistic locking on `Cup`.
- `@DynamicUpdate` so PATCH only updates dirty columns.
- ITs reuse the admin-login pattern (POST /api/auth/login → token); helper extracted inside the test class to keep things local.

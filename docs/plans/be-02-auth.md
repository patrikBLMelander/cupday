# Plan: Task BE-02 — Auth

Implementation plan for `docs/tasks/be-02-auth.md`. Approved 2026-04-27, cadence B.

## Files to create

- `backend/src/main/resources/db/migration/V2__app_user.sql`
- `backend/src/main/java/com/cup/backend/auth/User.java`
- `backend/src/main/java/com/cup/backend/auth/UserRepository.java`
- `backend/src/main/java/com/cup/backend/auth/CupAuthProperties.java`
- `backend/src/main/java/com/cup/backend/auth/AuthDtos.java`
- `backend/src/main/java/com/cup/backend/common/ProblemDetails.java`
- `backend/src/main/java/com/cup/backend/auth/JwtService.java`
- `backend/src/main/java/com/cup/backend/auth/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/cup/backend/auth/SecurityConfig.java`
- `backend/src/main/java/com/cup/backend/auth/AuthService.java`
- `backend/src/main/java/com/cup/backend/auth/AuthController.java`
- `backend/src/main/java/com/cup/backend/auth/AdminBootstrap.java`
- `backend/src/main/java/com/cup/backend/auth/BcryptHashCli.java`
- `backend/src/test/java/com/cup/backend/auth/JwtServiceTest.java`
- `backend/src/test/java/com/cup/backend/auth/AuthControllerIT.java`
- `backend/src/test/java/com/cup/backend/auth/AdminBootstrapIT.java`

## Files to modify

- `backend/pom.xml` — add `spring-boot-starter-security`, `jjwt-api/impl/jackson`, `exec-maven-plugin`.
- `backend/src/main/resources/application.properties` — add `cup.auth.*` properties bound to env vars.
- `backend/src/main/java/com/cup/backend/CupBackendApplication.java` — add `@ConfigurationPropertiesScan`.

## Iterations (cadence B)

| # | Files | Verify |
|---|---|---|
| 1 | `pom.xml`, `V2__app_user.sql`, `User.java`, `UserRepository.java` | `mvn -B -ntp compile` |
| 2 | `application.properties`, `CupAuthProperties.java`, `AuthDtos.java`, `ProblemDetails.java`, `CupBackendApplication.java` (annotation) | `mvn -B -ntp compile` |
| 3 | `JwtService.java`, `JwtAuthenticationFilter.java`, `SecurityConfig.java` | `mvn -B -ntp compile` |
| 4 | `AuthService.java`, `AuthController.java` | `mvn -B -ntp compile` |
| 5 | `AdminBootstrap.java`, `BcryptHashCli.java` | `mvn -B -ntp compile` |
| 6 | 3 test files + final `mvn -B -ntp verify` + diff scan | green |

## Notes

- jjwt 0.12.x. `jjwt-impl` and `jjwt-jackson` are runtime-scope.
- `@ConfigurationPropertiesScan` on the main app class picks up `CupAuthProperties` and any future `*Properties` records.
- `BCryptPasswordEncoder.upgradeEncoding(...)` is unused; we just use `matches` and `encode`.
- The IT tests inherit Testcontainers Postgres from `AbstractIntegrationTest`. `@TestPropertySource` supplies fixed JWT secret + admin creds for determinism.

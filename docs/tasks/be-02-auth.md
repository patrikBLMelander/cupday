# Task BE-02 — Auth

## User Story

As the cup organizer, I want to sign in to the backend with my email and password, get a token I can store in the browser, and use that token to call admin endpoints. The backend trusts a single admin account whose credentials I configure via environment variables — no signup, no user management UI.

## Goal

Implement the three auth endpoints (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`) end-to-end against a real Postgres-backed `app_user` table. JWT bearer tokens. Spring Security guards admin paths. The admin user is created (or refreshed) on every startup from env vars.

## Scope

1. `app_user` table via Flyway `V2__app_user.sql`.
2. `User` JPA entity + `UserRepository`.
3. `JwtService` — signs and parses HS256 tokens with `JWT_SECRET`. Subject = user id. Claim `email`. `iat` + `exp = iat + JWT_TTL_SECONDS`.
4. `JwtAuthenticationFilter` — reads `Authorization: Bearer <token>` on every request, validates, and populates the `SecurityContext` with the authenticated user.
5. `SecurityConfig` — stateless session, CSRF off, route rules:
   - `/api/auth/login`, `/api/auth/logout`, `/api/health`, `/actuator/health` — `permitAll`.
   - `/api/admin/**`, `/api/auth/me` — `authenticated`.
   - everything else — `permitAll` (later tasks add `authenticated` only where needed).
6. `AuthService` — verifies bcrypt password + issues tokens; resolves the current user from a JWT.
7. `AuthController` with the three endpoints. Errors via RFC-7807 problem details.
8. `AdminBootstrap` — on `ApplicationReadyEvent`, upserts the admin user from `CUP_ADMIN_EMAIL` + `CUP_ADMIN_PASSWORD_HASH`. Logs (and continues) if either is missing.
9. `BcryptHashCli` — small `main()` class that takes a plaintext password as the first arg and prints the bcrypt hash. Lets the user generate `CUP_ADMIN_PASSWORD_HASH` without leaving the project. Run via `mvn -q exec:java -Dexec.mainClass=com.cup.backend.auth.BcryptHashCli -Dexec.args=mypassword`.
10. Tests:
    - `JwtServiceTest` — round-trip + tampered-signature rejection + expiry rejection (3 unit tests).
    - `AuthControllerIT` — login happy path returns token + user; bad password returns 401; `/me` with valid token returns user; `/me` without token returns 401 (4 IT cases in one file).
    - `AdminBootstrapIT` — verifies the admin row is upserted at startup (1 IT case).

## Out of scope

- Self-signup endpoint.
- Password reset / forgot password.
- Refresh tokens (re-login on expiry).
- Multi-user / RBAC. The single admin has implicit "all admin endpoints" access.
- Audit logging. Standard Spring Security debug logs are enough for MVP.
- Rate limiting on login. Behind Railway with a single user; not worth the complexity yet.

## Domain & schema

```ts
type User = {
  id: UUID;          // surrogate key
  email: string;     // unique, lowercase
  passwordHash: string;  // bcrypt
  createdAt: timestamptz;
}
```

`V2__app_user.sql`:
```sql
CREATE TABLE app_user (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_app_user_email_lower ON app_user (LOWER(email));
```

Note: case-insensitive uniqueness via lower-cased index. JPA queries always pass `email.toLowerCase()`.

## API endpoints

### `POST /api/auth/login` (public)

Body:
```json
{ "email": "patrik@example.com", "password": "secret123" }
```

Response 200:
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "uuid", "email": "patrik@example.com" }
}
```

Failure 401 (RFC-7807):
```json
{ "type": "about:blank", "title": "Invalid credentials", "status": 401, "detail": "Email or password is invalid" }
```

The 401 detail is intentionally generic — never leak whether the email exists.

### `POST /api/auth/logout` (public)

Always returns 204 with no body. JWT is stateless; client discards the token. Endpoint exists for symmetry with the frontend's `useLogoutMutation`.

### `GET /api/auth/me` (authenticated)

Header: `Authorization: Bearer <token>`.

Response 200:
```json
{ "user": { "id": "uuid", "email": "patrik@example.com" } }
```

Failure 401 if the token is missing, malformed, expired, or signed with a different key.

## JWT details

- Algorithm: HS256.
- Secret: `JWT_SECRET` env var (≥ 256 bits / 32 bytes; library validates length).
- Claims: `sub` (user id, UUID as string), `email`, `iat`, `exp`.
- TTL: `JWT_TTL_SECONDS` env var (default 86400 = 24 h).
- Library: `io.jsonwebtoken:jjwt-api` + `jjwt-impl` + `jjwt-jackson` (runtime). Mature, widely used, reasonable API surface.

## Spring Security wiring

- One `SecurityFilterChain` bean.
- `csrf().disable()` (stateless API).
- `sessionManagement().sessionCreationPolicy(STATELESS)`.
- `JwtAuthenticationFilter` registered before `UsernamePasswordAuthenticationFilter`.
- 401 returns RFC-7807 problem details (custom `AuthenticationEntryPoint`).
- Public paths (allowList): `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/health`, `/actuator/**`.
- Authenticated paths: `GET /api/auth/me`, `/api/admin/**`.
- Other `/api/**` paths: `permitAll` for now; later tasks tighten as needed (most public endpoints are GET-public anyway per the cup-mvp contract).

## Admin bootstrap

`AdminBootstrap` listens for `ApplicationReadyEvent`:

```
adminEmail = env CUP_ADMIN_EMAIL          (required, else WARN + skip)
adminHash  = env CUP_ADMIN_PASSWORD_HASH  (required, else WARN + skip)

if both present:
  if user with email exists → update password_hash if it differs
  else                       → insert row with new UUID + email + hash + now()
```

The hash format must be bcrypt (`$2a$`, `$2b$`, or normalized `$2y$ → $2a$`). Hash format is validated; bad format = WARN + skip (not a hard failure — startup still succeeds for non-auth tasks like the healthcheck).

## DTOs (records)

```java
record LoginRequest(String email, String password) {}
record LoginResponse(String token, UserDto user) {}
record MeResponse(UserDto user) {}
record UserDto(UUID id, String email) {}
```

Validation: `@NotBlank` on email + password. `@Email` not strict — same regex tolerance the frontend uses.

## Files to create

- `src/main/java/com/cup/backend/auth/User.java` (entity)
- `src/main/java/com/cup/backend/auth/UserRepository.java`
- `src/main/java/com/cup/backend/auth/AuthDtos.java` (or split into multiple files; one file is fine for ~5 records)
- `src/main/java/com/cup/backend/auth/JwtService.java`
- `src/main/java/com/cup/backend/auth/JwtAuthenticationFilter.java`
- `src/main/java/com/cup/backend/auth/SecurityConfig.java`
- `src/main/java/com/cup/backend/auth/AuthService.java`
- `src/main/java/com/cup/backend/auth/AuthController.java`
- `src/main/java/com/cup/backend/auth/AdminBootstrap.java`
- `src/main/java/com/cup/backend/auth/BcryptHashCli.java`
- `src/main/java/com/cup/backend/common/ProblemDetails.java` (small RFC-7807 helper used by the auth entry point and reusable across later tasks)
- `src/main/resources/db/migration/V2__app_user.sql`
- 3 test files.

## Files to modify

- `backend/pom.xml` — add `spring-boot-starter-security`, `jjwt-api/impl/jackson`, and the `exec-maven-plugin` (so `mvn exec:java` works for the bcrypt CLI).
- `backend/src/main/resources/application.properties` — surface `cup.auth.jwt.secret`, `cup.auth.jwt.ttl-seconds`, `cup.auth.admin.email`, `cup.auth.admin.password-hash` properties bound to the env vars (so we can `@ConfigurationProperties` them rather than scattering `@Value`).

## Tests

| File | Cases |
|---|---|
| `JwtServiceTest.java` | 3 — round-trip token; tampered signature rejected; expired token rejected. |
| `AuthControllerIT.java` | 4 — login happy path; bad password 401; `/me` with token; `/me` without token 401. |
| `AdminBootstrapIT.java` | 1 — admin row exists after startup with the configured email and hash. |

`AuthControllerIT` uses `MockMvc` against a Testcontainers Postgres (extends `AbstractIntegrationTest`). The bootstrap test verifies the row directly via `UserRepository`.

`@TestPropertySource` (or `@DynamicPropertySource`) supplies fixed test values for `cup.auth.admin.email`, `cup.auth.admin.password-hash`, and `cup.auth.jwt.secret` so tests are deterministic.

## Risks / notes

- **JWT secret length** — jjwt requires ≥ 32 bytes for HS256. Tests provide a fixed 32-byte secret; production env must too.
- **Bcrypt prefix** — Spring's `BCryptPasswordEncoder` accepts `$2a$` and `$2b$`. If the user pastes a `$2y$` hash (BSD/htpasswd default), normalize to `$2a$` on read in `AdminBootstrap`.
- **Admin upsert idempotency** — repeated startups with the same hash are a no-op (no DB write). Only when the hash changes do we issue an UPDATE.
- **`@ConfigurationProperties` over `@Value`** — per `CODE_STANDARD.md`. Single `CupAuthProperties` record/class binds all four properties.
- **Constructor injection** — all new classes use `private final` fields + explicit constructor. No field injection.
- **`Optional` over `null`** — `UserRepository.findByEmailLower(...)` returns `Optional<User>`.
- **Frontend compatibility** — the response shapes (`{ token, user }`, `{ user }`) match what `frontend/src/features/auth/authApi.ts` expects today. No frontend changes needed when we eventually swap MSW out.
- **MSW worker bypassing the real backend** — during BE-02 development the frontend dev server still runs MSW, which intercepts `/api/auth/*` before the request leaves the browser. To test against the real backend, we'd need to either disable MSW per request or wait for BE-06 (deploy task) which flips the global switch. For now, tests via curl + the IT harness are the verification path.
- **Reusing `ProblemDetails`** — a tiny helper that future tasks (cup CRUD, registration, schedule) will import for their own 4xx responses.

## Acceptance criteria

- [ ] `V2__app_user.sql` applies cleanly on a fresh DB; `app_user` table exists with the email-lowercase unique index.
- [ ] On startup with `CUP_ADMIN_EMAIL` + `CUP_ADMIN_PASSWORD_HASH` set, the row exists. Re-running with the same hash is a no-op; changing the hash updates the row.
- [ ] `POST /api/auth/login` with the right email + password returns 200 with `{ token, user }`. The token is a valid HS256 JWT signed with `JWT_SECRET`.
- [ ] `POST /api/auth/login` with the wrong password returns 401 with the generic problem detail.
- [ ] `GET /api/auth/me` with `Authorization: Bearer <token>` returns 200 with `{ user }`.
- [ ] `GET /api/auth/me` without a token (or with an expired/tampered one) returns 401.
- [ ] `POST /api/auth/logout` always returns 204.
- [ ] All three test files pass via `mvn verify`. Total IT count gains 5; UT count gains 3.
- [ ] `BcryptHashCli` prints a usable bcrypt hash for any plaintext input.
- [ ] All new code follows `CODE_STANDARD.md`: 2-space indent, K&R braces, constructor injection, records for DTOs, `Optional`-returning queries, `@ConfigurationProperties` for env-driven settings.

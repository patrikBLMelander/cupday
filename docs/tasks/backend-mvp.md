# Backend MVP — Requirements

## Context

The frontend MVP for the Cup webapp is built and runs against MSW (Mock Service Worker) handlers in the browser. This document captures the contract those handlers expose and what a real Java + Spring Boot backend needs to implement so the frontend can switch from MSW to a deployed backend with only a `baseUrl` change in each `*Api.ts` slice.

The frontend is the source of truth for the API shape — see `frontend/src/mocks/handlers.ts` and the type modules in `frontend/src/features/*/`. This document is a stable, human-readable summary so the backend can be built without round-tripping the TypeScript files for every detail.

## Primary user

A single organizer (the project owner) signs in to the admin and runs a single cup at a time. Multi-tenant signup is explicitly v2 and out of scope.

## Goals

1. Implement every `/api/*` endpoint the frontend already calls, with matching paths, JSON shapes, and HTTP status codes.
2. Support the registration → reserved → paid → cancelled lifecycle and the cup-status auto-transitions (`open ⇄ full`, `open|full → scheduled`).
3. Provide a deterministic schedule generator that produces the same 12-match round-robin layout the TS implementation produces (alternating-group slots).
4. Run on Postgres in production and via Testcontainers in tests, with Flyway-managed migrations.
5. Deploy as a Railway service alongside the frontend.

## Non-goals (explicit v2)

- User signup / multi-tenant. Single admin only, configured via env vars at startup.
- Score entry and standings (Swedish FA disallows score-keeping for 9-year-olds — same constraint as the frontend).
- Payment integration. The Lagkassan link/QR is static config per cup; the organizer manually flips paid status.
- Email / SMS notifications.
- Public registration spam protection (CAPTCHA etc.).
- Knockout / bracket formats.
- Re-activating cancelled teams.

## Stack (confirmed)

- Spring Boot 3.x, Java 21, Maven.
- Spring MVC (REST controllers + Jackson) — this is a brand-new service, so per `CODE_STANDARD.md` we use Spring MVC, not JAX-RS.
- Spring Data JPA + PostgreSQL.
- Flyway migrations.
- Spring Security with JWT bearer tokens.
- JUnit 5 + AssertJ + Mockito; integration tests with Testcontainers (`postgresql`).
- **Docker + Docker Compose** — backend ships with a multi-stage Dockerfile from the scaffold task; local stack runs via Compose.

## Local development workflow

The repo's Compose file defines two services: `postgres` and `backend`. Two ways to run, depending on what you're iterating on:

- **Active backend dev (fastest loop):** `docker compose up -d postgres`, then `mvn spring-boot:run` natively. Spring DevTools picks up classpath changes; tests run via Testcontainers (which spins up its own Postgres, separate from compose).
- **Prod-parity smoke / pre-deploy verification:** `docker compose up` builds and runs the backend in its container against the same Postgres. Mirrors what Railway will run.

Frontend dev stays native: `cd frontend && npm run dev`. Vite HMR is fastest against the host file system. Frontend points at `http://localhost:8080/api` (the backend's exposed port) when MSW is disabled.

## Auth model

Single admin account. Credentials configured at startup via environment variables:

```
CUP_ADMIN_EMAIL=patrik@example.com
CUP_ADMIN_PASSWORD_HASH=<bcrypt hash>
JWT_SECRET=<random 256-bit>
JWT_TTL_SECONDS=86400  # 24 h
```

On startup, the app upserts the admin row in the `app_user` table (so the bcrypt hash is the source of truth, never plaintext in env vars long-term — env can be rotated without touching the DB).

`POST /api/auth/login` returns a JWT signed with `JWT_SECRET`, with `sub = userId`, `iat`, `exp = iat + JWT_TTL_SECONDS`, and a small `email` claim. Spring Security validates the bearer token on every protected request. There's no refresh endpoint; on expiry the user logs in again. `POST /api/auth/logout` is a no-op for JWTs (stateless) but the endpoint exists for symmetry — returns 204. `GET /api/auth/me` decodes the token and returns the user.

The frontend persists the token in `localStorage` (already implemented). RTK Query's `prepareHeaders` adds the `Authorization: Bearer <token>` header to every request.

## Domain entities

```
app_user
  id (UUID), email (unique), password_hash, created_at

cup
  id (UUID), slug (unique), name,
  organizing_club_name,
  primary_color_hsl, accent_color_hsl,         -- "H S% L%" strings
  start_date, end_date,                         -- DATE
  venue_name,
  pitch_count, max_teams,
  registration_fee_sek,
  payment_instructions,
  payment_lagkassan_link, payment_lagkassan_qr_url,
  organizer_contact_name, organizer_contact_email, organizer_contact_phone,
  status,                                       -- enum: draft|open|full|scheduled|finished
  created_at,
  -- @Version for optimistic locking when registrations + admin edits race

team
  id (UUID), cup_id (FK), registration_id (FK),
  name, club_name,
  contact_name, contact_email, contact_phone,
  group_label,                                  -- enum: A|B|null
  status,                                       -- enum: reserved|paid|cancelled
  created_at, paid_at, cancelled_at,
  unique (cup_id, lower(name)) WHERE status != 'cancelled'

registration
  id (UUID), cup_id (FK), created_at
  -- team rows reference this; no separate teams collection on the row

match
  id (UUID), cup_id (FK),
  group_label,                                  -- enum: A|B
  pitch,                                        -- enum: 1|2 (or smallint with check)
  start_time,                                   -- timestamptz
  home_team_id (FK), away_team_id (FK)
```

Notes:
- `team.unique(cup_id, lower(name))` filtered by `status != 'cancelled'` enforces "names are reusable after cancellation". Postgres supports partial unique indexes.
- `cup.@Version` lets the registration handler detect concurrent registrations attempting to claim the last spot.
- `team.group_label` is nullable until the organizer assigns a group on the admin teams page.

## API contract

All endpoints are under `/api`. Errors are returned as RFC-7807 problem details (`Content-Type: application/problem+json`) with `type`, `title`, `status`, `detail`. 4xx-specific extensions where noted.

Paths matching `/api/admin/**` require a valid bearer token. Paths under `/api/auth/me` also require a token. Everything else under `/api/*` is public.

### Auth

- `POST /api/auth/login` — body `{ email, password }`. 200 `{ token, user: { id, email } }`. 401 on bad credentials.
- `POST /api/auth/logout` — 204. (Stateless; client-side token discard suffices.)
- `GET /api/auth/me` — 200 `{ user: { id, email } }`. 401 if token is missing/invalid/expired.

### Cups

Admin (require auth):
- `GET /api/admin/cups` — `Cup[]` sorted by `createdAt` desc.
- `POST /api/admin/cups` — body is the `CupCreateRequest` (every field except `id`, `status`, `createdAt`). Defaults `status = draft`. 201 → `Cup`. 400 on validation, 409 on duplicate slug.
- `GET /api/admin/cups/{id}` — 200 `Cup`, 404 if missing.
- `PATCH /api/admin/cups/{id}` — body is a partial `Cup` (any of the editable fields plus `status`). 200 `Cup`, 404, 409 on slug collision.
- `DELETE /api/admin/cups/{id}` — 204, 404 if missing. Cascade: matches and teams for the cup are removed too (via FK cascade).

Public:
- `GET /api/cups/by-slug/{slug}` — 200 `Cup`, 404. Returns the same `Cup` shape (the contact fields aren't sensitive — they're the public point-of-contact for visitors).

### Teams

Admin:
- `GET /api/admin/cups/{id}/teams` — full `Team[]` for the cup, sorted by `createdAt` ascending. 404 if cup missing.
- `PATCH /api/admin/teams/{id}` — body `{ status?, groupLabel? }`. Stamps `paidAt`/`cancelledAt` on the relevant transitions. If a `cancelled` transition drops the cup's active count below `maxTeams` and the cup was `full`, transitions cup back to `open`. 200 `Team`, 404.

Public:
- `GET /api/cups/{id}/teams` — `PublicTeam[]` (id, name, groupLabel, status). Excludes `status='cancelled'`. 404 if cup missing.

Registration:
- `POST /api/cups/{id}/registrations` (public) — body `{ clubName, contactName, contactEmail, contactPhone, teamNames: string[] }` (1 or 2 names). On success creates one `team` row per name in `reserved` status sharing a fresh `registrationId`. 201 `{ registrationId, teamIds }`.
  - 404 if cup missing.
  - 422 with detail "Registration not open" when `cup.status != 'open'`.
  - 422 with detail "Cup is full" when capacity would be exceeded.
  - 400 on missing/invalid fields, on duplicate names within the request, or on more than 2 names.
  - 409 with `teamName` extension when a team name collides (case-insensitive trim) with an existing non-cancelled team. Body: `{ ..., detail, teamName }`.
  - On success, if active count reaches `maxTeams`, atomically transition cup to `full`.
- `GET /api/registrations/{id}` (public) — 200 `{ registration, teams: PublicTeam[] }`. 404 if missing.

### Schedule

Public:
- `GET /api/cups/{id}/matches` — `Match[]` sorted by `startTime`. 404 if cup missing.

Admin:
- `POST /api/admin/cups/{id}/schedule/generate` — body `{ startTime, matchDurationMinutes, breakBetweenMatchesMinutes }`. Requires exactly 4 `paid` teams in each of group A and B. Replaces existing matches for the cup. Auto-transitions cup status `open|full → scheduled`; refuses (422) on `draft`. 200 `Match[]`.
- `PATCH /api/admin/matches/{id}` — body `{ startTime?, pitch? }`. 200 `Match`, 404.

## Schedule generator algorithm

Re-implementation of `frontend/src/features/schedule/scheduleGenerator.ts`. Same layout: 6 time slots, even slots run a Group A round (both matches in parallel on pitches 1 and 2), odd slots run a Group B round.

For 4 teams `[t1, t2, t3, t4]`:
```
Round 1: (t1 vs t2), (t3 vs t4)
Round 2: (t1 vs t3), (t2 vs t4)
Round 3: (t1 vs t4), (t2 vs t3)
```

Slot N runs `Math.floor(N / 2)`-th round of group A (if N even) or group B (if N odd). `slotStart(N) = startTime + N * (matchDurationMinutes + breakBetweenMatchesMinutes) minutes`. Match 1 of each round goes on pitch 1; match 2 on pitch 2.

Result: 12 matches. Every team plays exactly 3 with a uniform 1-slot rest.

The Java implementation should be a pure function (`ScheduleGenerator.generate(...)`) covered by JUnit unit tests mirroring the TS test cases.

## Multi-pod safety (forward-looking)

Even though MVP runs as one Railway service, write all code so it's safe to scale horizontally later:

- Use `@Version` on `cup` for concurrent registration races.
- The registration handler's count-check + insert + status flip happens inside a single `@Transactional` boundary on `SERIALIZABLE` (or use a unique constraint + retry pattern).
- The `team` partial unique index is the actual line of defense against duplicate names; the explicit check is a UX nicety that returns 409 with the offending name.
- No `@Scheduled` jobs in MVP — if any land later, they'll need ShedLock per `CODE_STANDARD.md`.

## Stack-related conventions (from `CODE_STANDARD.md`)

- Constructor injection on all new classes (no field injection).
- `record` for DTOs and event payloads; sealed interfaces if a closed hierarchy is appropriate.
- `Optional` over `null` for query results; never `.get()` — use `.orElseThrow`.
- Pattern-matching switches in services; data carriers stay logic-free.
- 2-space indent, K&R braces, LF line endings, line length ≤ 120 — same as everywhere.

## Task breakdown

The umbrella task is decomposed into per-feature backend tasks driven through `/implement-backend` (cadence-B style, mirroring the frontend rhythm):

| # | Task | Scope |
|---|------|-------|
| 0 | (manual scaffold) | Spring Boot project + Maven layout, multi-stage Dockerfile, `docker-compose.yml` (Postgres + backend), Flyway baseline migration, healthcheck endpoint, Testcontainers wiring, one passing integration test. |
| 01 | Auth | `app_user` entity + Flyway, `AuthService`, Spring Security with JWT, login/logout/me endpoints, env-driven admin upsert on startup. |
| 02 | Cup CRUD | `cup` entity + Flyway, admin CRUD endpoints, public by-slug endpoint, validation, slug collision handling. |
| 03 | Team registration | `team` + `registration` entities + Flyway with the partial unique index, public registration endpoint with status auto-transition to `full`, public teams + registration lookup endpoints. |
| 04 | Admin team management | Admin teams list + PATCH endpoint with paid/cancelled stamping and `full → open` rebound. |
| 05 | Schedule | `match` entity + Flyway, `ScheduleGenerator` Java impl + unit tests, generate/list/update endpoints, `open|full → scheduled` auto-transition. |
| 06 | Railway deploy | Plug the existing Dockerfile into a Railway service, attach the Postgres add-on, set env vars (admin creds, JWT secret, DB URL), swap frontend `resolveBaseUrl` to point at the deployed backend, drop MSW worker startup. (Frontend gets its own Dockerfile in this task too — nginx-served static + SPA fallback.) |

Each task maps 1:1 to a `docs/tasks/be-{N}-*.md` file; plans live in `docs/plans/be-{N}-*.md`. Use the `be-` prefix to keep backend tasks visually distinct from the frontend task files.

## Acceptance criteria for the umbrella

- [ ] Every endpoint listed above is implemented with the documented status codes and JSON shape.
- [ ] All integration tests pass against a real Postgres via Testcontainers.
- [ ] The frontend can swap `resolveBaseUrl` from MSW to the deployed backend without changing the UI behavior.
- [ ] The admin user is created on first startup from env vars and login works against a bcrypt-stored password.
- [ ] All Flyway migrations apply cleanly from an empty DB on every fresh test run.
- [ ] `mvnd install` (or `mvn -T 1C install`) and `mvnd test` both pass green.
- [ ] Code adheres to `CODE_STANDARD.md` — verified via the repo's existing standards review pattern.

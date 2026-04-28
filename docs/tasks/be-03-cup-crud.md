# Task BE-03 — Cup CRUD

## User Story

As the cup organizer, I want to create, edit, and delete cups via the admin endpoints, and have the public-facing landing page (`/c/<slug>`) load its cup data from a public by-slug endpoint. Slug collisions are surfaced as 409 with the offending slug so the frontend can attach the error to the right field.

## Goal

Implement the full Cup CRUD surface end-to-end against a Postgres-backed `cup` table. Five admin endpoints + one public endpoint, all matching the JSON shape the frontend already speaks via MSW.

## Scope

1. `cup` table via Flyway `V3__cup.sql`. Includes all fields from the frontend's `Cup` type, a `lower(slug)` unique index isn't needed (slug is already lowercase by validation; a plain unique on `slug` is enough), and a JPA `@Version` column for optimistic locking (so registration races in BE-04 are safe).
2. `Cup` JPA entity, `CupRepository`, `CupStatus` enum.
3. `CupDtos` — `CupResponse`, `CupCreateRequest`, `CupUpdateRequest`, plus a nested `CupColors` record for the JSON shape.
4. `CupService` — list / get-by-id / get-by-slug / create / update / delete, with cross-field validation (`startDate ≤ endDate`) and slug-uniqueness checks.
5. `CupController` (admin, requires auth) at `/api/admin/cups` — 5 endpoints.
6. `PublicCupController` (public) at `/api/cups/by-slug/{slug}` — 1 endpoint.
7. `GlobalExceptionHandler` (`@RestControllerAdvice`) translating `CupNotFoundException`, `SlugConflictException`, and Bean-Validation `MethodArgumentNotValidException` into RFC-7807 responses. This also retroactively makes login-validation errors RFC-7807 instead of Spring's default JSON.

## Out of scope

- Cup status transitions beyond accepting `status` on PATCH (the auto-transitions live in BE-04 registration, BE-05 admin teams, BE-06 schedule).
- Bulk operations.
- Sorting / filtering beyond "list by createdAt desc".
- HSL color format validation server-side. Frontend enforces the format; backend accepts any non-blank string. (We could tighten later.)
- Soft delete. `DELETE` removes the row. Cascade-deletes for teams and matches will fall out of FK constraints in BE-04 / BE-06.

## Domain & schema

```sql
CREATE TABLE cup (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  organizing_club_name TEXT NOT NULL,
  primary_color_hsl TEXT NOT NULL,
  accent_color_hsl TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  venue_name TEXT NOT NULL,
  pitch_count SMALLINT NOT NULL CHECK (pitch_count >= 1),
  max_teams SMALLINT NOT NULL CHECK (max_teams >= 2),
  registration_fee_sek INTEGER NOT NULL CHECK (registration_fee_sek >= 0),
  payment_instructions TEXT NOT NULL DEFAULT '',
  payment_lagkassan_link TEXT NOT NULL DEFAULT '',
  payment_lagkassan_qr_url TEXT NOT NULL DEFAULT '',
  organizer_contact_name TEXT NOT NULL,
  organizer_contact_email TEXT NOT NULL,
  organizer_contact_phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'OPEN', 'FULL', 'SCHEDULED', 'FINISHED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 0
);
```

`CupStatus` enum (Java side):
```java
public enum CupStatus {
  DRAFT, OPEN, FULL, SCHEDULED, FINISHED;
}
```

JSON wire format is **lowercase** (matches the frontend). Achieved with `@JsonValue` on a `toJson()` method returning `name().toLowerCase()` and `@JsonCreator` for the inverse. DB stores the uppercase enum name via `@Enumerated(EnumType.STRING)` — bridged at the Jackson layer, not at the JPA layer.

## API contract

### Admin (require bearer token)

#### `GET /api/admin/cups`
Returns `Cup[]` sorted by `createdAt` desc.

#### `POST /api/admin/cups`
Body: `CupCreateRequest`. On success: 201 with the created `Cup` (status defaults to `draft`).
- 400 with field-level `errors[]` if Bean Validation fails or `startDate > endDate`.
- 409 with `slug` extension if the slug is already taken.

#### `GET /api/admin/cups/{id}`
200 `Cup`, or 404 if missing.

#### `PATCH /api/admin/cups/{id}`
Body: `CupUpdateRequest` (any subset of fields plus optional `status`). Returns the updated `Cup`. 404 if missing, 409 on slug collision, 400 on validation.

#### `DELETE /api/admin/cups/{id}`
204, or 404.

### Public

#### `GET /api/cups/by-slug/{slug}`
200 `Cup`, 404 if missing. No auth.

## DTO shapes

```java
public record CupColors(String primary, String accent) {}

public record CupResponse(
    UUID id, String slug, String name,
    String organizingClubName, CupColors organizingClubColors,
    LocalDate startDate, LocalDate endDate,
    String venueName,
    int pitchCount, int maxTeams,
    int registrationFeeSek,
    String paymentInstructions, String paymentLagkassanLink, String paymentLagkassanQrUrl,
    String organizerContactName, String organizerContactEmail, String organizerContactPhone,
    CupStatus status,
    Instant createdAt) {

  public static CupResponse from(Cup cup) { ... }
}

public record CupCreateRequest(
    @NotBlank @Pattern(regexp = "^[a-z0-9-]+$") String slug,
    @NotBlank String name,
    @NotBlank String organizingClubName,
    @NotNull CupColors organizingClubColors,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    @NotBlank String venueName,
    @Min(1) int pitchCount,
    @Min(2) int maxTeams,
    @Min(0) int registrationFeeSek,
    String paymentInstructions,
    String paymentLagkassanLink,
    String paymentLagkassanQrUrl,
    @NotBlank String organizerContactName,
    @Email String organizerContactEmail,
    @NotBlank String organizerContactPhone) {}

public record CupUpdateRequest(
    String slug,                              // null = leave unchanged
    String name,
    String organizingClubName,
    CupColors organizingClubColors,
    LocalDate startDate,
    LocalDate endDate,
    String venueName,
    Integer pitchCount,                       // boxed so null = leave unchanged
    Integer maxTeams,
    Integer registrationFeeSek,
    String paymentInstructions,
    String paymentLagkassanLink,
    String paymentLagkassanQrUrl,
    String organizerContactName,
    String organizerContactEmail,
    String organizerContactPhone,
    CupStatus status) {}
```

PATCH semantics: `null` field = leave unchanged. Empty string is a meaningful value (clears optional fields like instructions).

## Service-layer rules

- **Slug uniqueness:** `repository.existsBySlug(req.slug())` before insert; on update, `existsBySlugAndIdNot(slug, id)`. Throw `SlugConflictException(slug)`.
- **Date order:** `startDate ≤ endDate`. Service throws `IllegalArgumentException("startDate must be on or before endDate")` → handler returns 400.
- **`maxTeams` reduction guard:** out of scope — the frontend warns. Backend doesn't currently validate that the new `maxTeams` ≥ existing team count (no team table yet; revisit in BE-04 if needed).
- **Status transitions:** PATCH accepts any status. Auto-transitions are introduced by later tasks. For now the field is just a settable string.
- **Optimistic lock collisions:** `ObjectOptimisticLockingFailureException` from JPA → 409. Add a handler entry (returns "Cup was modified by another writer; reload and retry").

## Files to create

- `backend/src/main/java/com/cup/backend/cups/Cup.java` — entity with `@Version`.
- `backend/src/main/java/com/cup/backend/cups/CupStatus.java` — enum + Jackson lowercase mapping.
- `backend/src/main/java/com/cup/backend/cups/CupRepository.java` — `JpaRepository<Cup, UUID>` with `findBySlug`, `existsBySlug`, `existsBySlugAndIdNot`, `findAll(Sort)`.
- `backend/src/main/java/com/cup/backend/cups/CupDtos.java` — request and response records (one file with multiple inner records is fine; matches the auth pattern).
- `backend/src/main/java/com/cup/backend/cups/CupService.java`
- `backend/src/main/java/com/cup/backend/cups/CupController.java`
- `backend/src/main/java/com/cup/backend/cups/PublicCupController.java`
- `backend/src/main/java/com/cup/backend/cups/CupNotFoundException.java`
- `backend/src/main/java/com/cup/backend/cups/SlugConflictException.java`
- `backend/src/main/java/com/cup/backend/common/GlobalExceptionHandler.java`
- `backend/src/main/resources/db/migration/V3__cup.sql`
- 3 test files (see below).

## Files to modify

- None. SecurityConfig already sends `/api/admin/**` through auth and lets everything else through; the new public endpoint sits under `/api/cups/by-slug/**` which falls under `permitAll`.

## Tests

| File | Cases |
|---|---|
| `CupServiceTest.java` | 2 — `startDate > endDate` throws; duplicate slug on create throws `SlugConflictException`. |
| `CupControllerIT.java` | 3 — admin list+create+get round-trip; unauthenticated POST returns 401; DELETE then GET returns 404. |
| `PublicCupControllerIT.java` | 1 — by-slug returns 200 for existing cup, 404 for unknown slug (one test, two assertions). |

Both ITs extend `AbstractIntegrationTest`. They register an admin user via `@DynamicPropertySource` (same pattern as `AuthControllerIT`) and obtain a JWT through the existing login endpoint to authenticate admin calls.

## Risks / notes

- **Enum case mismatch** — Java `UPPER_CASE`, JSON `lower-case`. Solved with `@JsonValue` / `@JsonCreator` on `CupStatus`. Not solved at the DB layer — DB stores uppercase via `EnumType.STRING`; frontend never sees it.
- **`@Version` semantics** — first INSERT sets version=0; first UPDATE bumps to 1. Hibernate auto-manages. Conflict during concurrent update returns 409 via the global handler.
- **Cascade delete** — not needed yet. Once team and match tables land in BE-04 / BE-06, their FKs to `cup.id` will be `ON DELETE CASCADE` (defined in those tasks' migrations, not this one).
- **`DateTimeException` from Jackson** when bad ISO date strings come in — Spring's deserializer throws `HttpMessageNotReadableException`. Add a handler entry returning 400 (small but worthwhile).
- **`CupCreateRequest`'s `pitchCount` and `maxTeams` are primitive `int`** — Bean Validation `@Min` works; nulls aren't possible. `CupUpdateRequest` uses `Integer` so `null` means "don't change".
- **GlobalExceptionHandler retroactively benefits BE-02** — login validation errors (e.g. blank email) become RFC-7807 instead of Spring's default body. Existing AuthControllerIT only asserts the status code, so no test changes needed.
- **MSW handler cross-check** — frontend's mock `POST /api/admin/cups` expects status 201 with a full `Cup` body and a 409 problem detail with `detail` containing the conflicting slug. The backend must mirror this exactly so the frontend's `cupsApi.test.ts` keeps passing once we eventually point it at the real backend.
- **Color format leniency** — backend accepts any non-blank string for `primary` / `accent`. If the frontend ever rounds-trips a malformed value the cup loads but theming breaks. Acceptable risk; tightening is a one-line `@Pattern` later.

## Acceptance criteria

- [ ] `V3__cup.sql` applies cleanly on a fresh DB; `cup` table + `slug` unique index exist.
- [ ] `POST /api/admin/cups` creates a `draft` cup and returns 201 with the body the frontend expects (lowercase status).
- [ ] `POST` with an invalid slug, missing fields, or `startDate > endDate` returns 400 with field-level errors.
- [ ] `POST` with a duplicate slug returns 409 with the conflicting slug in the response extension.
- [ ] `GET /api/admin/cups` returns the list sorted by `createdAt` desc.
- [ ] `GET /api/admin/cups/{id}` returns 200 or 404.
- [ ] `PATCH /api/admin/cups/{id}` updates only the fields provided; 404 / 409 / 400 paths work.
- [ ] `DELETE /api/admin/cups/{id}` returns 204; subsequent `GET` returns 404.
- [ ] `GET /api/cups/by-slug/{slug}` works without auth and returns 200 / 404.
- [ ] All admin endpoints return 401 (RFC-7807) without a valid bearer token.
- [ ] `mvn verify` green: existing 9 tests + 6 new tests = 15 total. (3 UT + 3 IT new in this task.)
- [ ] All new code follows `CODE_STANDARD.md` — constructor injection, records for DTOs, `Optional`-returning queries, no field injection, 2-space indent.

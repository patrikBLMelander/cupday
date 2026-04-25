# Task 02 — Cup CRUD

## User Story

As the organizer, I want to create and edit cups from the admin panel — name, dates, venue, capacity, registration fee + payment instructions, organizer contact, and the cup's brand colors — and I want to see all my cups at a glance from the `/admin` landing.

## Goal

Replace the temporary Welcome placeholder with a real admin cup list, and add a settings page that lets the organizer create new cups and edit any field on existing ones. After this task, every later admin feature (teams, schedule, etc.) plugs into a real cup record.

## Scope

1. `cupsApi` RTK Query slice (list, get-by-id, get-by-slug, create, update, delete).
2. `AdminCupListPage` at `/admin` — table of cups with create CTA + empty state.
3. `AdminCupSettingsPage` at `/admin/cups/new` and `/admin/cups/:id` — single component that handles both create and edit.
4. `lib/slug.ts` — deterministic slug generator from the cup name.
5. `lib/color.ts` — hex ↔ HSL-channels conversion for theme storage.
6. Status action: a button on the settings page that transitions `draft → open` ("Open registrations").
7. Mock CRUD handlers backed by `MockDB.cups`.

## Out of scope

- Cup deletion confirmation dialog. (Soft-delete or no delete in MVP — defer to v2.)
- Status transitions other than `draft → open`. (`open → full` is auto in Task 06; the rest later.)
- Lagkassan QR file upload. URL string field only.
- Public landing page (`/c/:slug`) — Task 03.
- Form-state library beyond plain `useState` for now. (Will adopt `react-hook-form` in Task 04 with the registration form.)
- Public cup endpoint (`/api/cups/by-slug/{slug}`) — wired in this task but consumed in Task 03.

## Domain model (Cup)

Match `docs/tasks/cup-mvp.md`. The mock stores HSL channel strings (not hex) for colors so they drop straight into CSS vars.

```ts
type Cup = {
  id: string;
  slug: string;
  name: string;
  organizingClubName: string;
  organizingClubColors: { primary: string; accent: string }; // "h s% l%" — e.g. "220 90% 50%"
  startDate: string; // ISO yyyy-mm-dd
  endDate: string;   // ISO yyyy-mm-dd
  venueName: string;
  pitchCount: number; // default 2, min 1
  maxTeams: number;   // default 8, min 2
  registrationFeeSek: number; // ≥ 0
  paymentInstructions: string;
  paymentLagkassanLink: string; // URL
  paymentLagkassanQrUrl: string; // URL
  organizerContactName: string;
  organizerContactEmail: string;
  organizerContactPhone: string;
  status: 'draft' | 'open' | 'full' | 'scheduled' | 'finished';
  createdAt: string; // ISO datetime
};
```

## Mock API endpoints (admin requires bearer token)

- `GET /api/admin/cups` → `Cup[]` (sorted by `createdAt` desc).
- `POST /api/admin/cups` → `Cup` (status defaults to `draft`).
  - 400 problem detail on validation failure.
  - 409 problem detail if slug already exists.
- `GET /api/admin/cups/:id` → `Cup` or 404.
- `PATCH /api/admin/cups/:id` → `Cup`.
- `DELETE /api/admin/cups/:id` → 204 (wired but no UI in this task).
- `GET /api/cups/by-slug/:slug` → `Cup` (public, no auth — used by Task 03).

All admin endpoints return 401 when the bearer token is missing/invalid (reuse the existing token-check helper).

## UX details

### `AdminCupListPage` (`/admin`)

- Replaces the inline `Welcome` placeholder.
- Header row: page title `t('admin.cups.title')` + a `Button` "Create cup" → `/admin/cups/new`.
- Body:
  - Empty state when no cups: short message + the same Create cup CTA.
  - Otherwise a `Card`-based list (one card per cup): cup name, dates, status badge, team count placeholder ("— teams" until Task 06), and a "Edit" button → `/admin/cups/:id`.

### `AdminCupSettingsPage` (`/admin/cups/new`, `/admin/cups/:id`)

- Single component. Detects mode by `useParams().id`.
- Sectioned form using `Card` per section:
  1. **Basics** — name, slug (auto-filled from name on create until user edits it), organizing club, start date, end date, venue.
  2. **Capacity** — pitch count, max teams.
  3. **Branding** — primary color (`<input type="color">`), accent color, live preview swatch using the chosen HSL.
  4. **Registration** — fee (SEK), payment instructions (`<textarea>`), Lagkassan link, Lagkassan QR URL.
  5. **Organizer contact** — name, email, phone.
- Bottom bar: "Save" button. When mode = `edit` and `status = draft`, also show "Save and open registrations" (saves first, then transitions status to `open`).
- After successful create → navigate to `/admin/cups/:newId` (so the user is now editing the just-created cup).
- After successful update → toast or inline success indicator (a simple green checkmark next to the Save button is fine — no toast lib yet).
- Validation: name non-empty; slug non-empty + matches `/^[a-z0-9-]+$/`; dates valid ISO + start ≤ end; pitchCount ≥ 1; maxTeams ≥ 2; fee ≥ 0; emails match the same regex used for login.

## shadcn/ui components to add

`textarea`, `badge`. (`button`, `input`, `label`, `card` already in.)

## Files to create

- `src/features/cups/cupsApi.ts` — RTK Query slice with all six endpoints. Tag: `Cups`.
- `src/features/cups/cupTypes.ts` — `Cup` type, `CupStatus` union, `CupCreateRequest`, `CupUpdateRequest`.
- `src/features/cups/AdminCupListPage.tsx`
- `src/features/cups/AdminCupSettingsPage.tsx`
- `src/features/cups/CupStatusBadge.tsx` — small reusable status badge (used here and later in Task 06).
- `src/lib/slug.ts` — `slugify(name: string): string` (lowercase, ASCII-fold via `String.normalize('NFKD')`, replace non-alphanumerics with `-`, collapse, trim).
- `src/lib/color.ts` — `hexToHslChannels(hex: string): string` and `hslChannelsToHex(channels: string): string`.

## Files to modify

- `src/app/store.ts` — register `cupsApi`.
- `src/app/routes.tsx` — replace the inline `AdminWelcome` element with `AdminCupListPage`; add `/admin/cups/new` and `/admin/cups/:id` under `AdminLayout`.
- `src/mocks/handlers.ts` — add the cup CRUD handlers; share the `getBearerToken` and `problem` helpers.
- `src/mocks/db.ts` — type `cups` as `Cup[]`.
- `src/locales/sv/translation.json` and `en/translation.json` — see "i18n keys" below.

## i18n keys (add)

```
admin.cups: { title, createCta, emptyState, edit, dates, status, teams }
admin.cup: { newTitle, editTitle, save, saveAndOpen, savedFlash }
admin.cupForm: {
  basics, name, slug, organizingClub, startDate, endDate, venue,
  capacity, pitchCount, maxTeams,
  branding, primaryColor, accentColor, preview,
  registration, fee, paymentInstructions, lagkassanLink, lagkassanQrUrl,
  contact, contactName, contactEmail, contactPhone,
  validation: { required, slugInvalid, dateOrder, emailInvalid, minPitchCount, minMaxTeams, nonNegative }
}
admin.cupStatus: { draft, open, full, scheduled, finished }
```

## Tests

| File | Count | What |
|---|---|---|
| `lib/slug.test.ts` | 2 | Diacritic + space handling; idempotent (slugifying a slug yields the same string). |
| `lib/color.test.ts` | 1 | Round-trip `hexToHslChannels` → `hslChannelsToHex` for a few sample colors. |
| `cupsApi.test.ts` | 1 | Integration: create → list → get-by-id → patch → list reflects the patch. |
| `AdminCupListPage.test.tsx` | 1 | Empty state renders the create CTA. |
| `AdminCupSettingsPage.test.tsx` | 2 | Create mode submits a valid cup and navigates to edit; required-field validation blocks submit. |

`beforeEach` resets the mock DB (already global in `setup.ts`).

## Risks / notes

- **Slug uniqueness** — handler returns 409 with the conflicting slug in the problem detail; the form shows an inline error on the slug field. Auto-fill from name on create *only until the user touches the slug field manually* — track an `isSlugDirty` ref.
- **Color preview accessibility** — preview swatch needs a contrast-aware text overlay or a label; I'll use a label below it ("Preview") rather than text on the swatch.
- **Date inputs** — use `<input type="date">` for both browser native (no extra dep). Output is `YYYY-MM-DD` which matches `Cup.startDate`/`endDate`.
- **HSL channel format** — store as `"H S% L%"` with a single space. Template literal in CSS: `hsl(${cup.organizingClubColors.primary})`. Tailwind's `hsl(var(--cup-primary) / <alpha-value>)` keeps working.
- **Form length** — ~15 inputs is at the upper edge of "controlled `useState` is fine". Acceptable for one screen; switch to react-hook-form in Task 04 when the registration form lands.
- **Auth on admin endpoints** — every admin handler must check the bearer token. Extract a small helper `requireAuth(request): MockUser | HttpResponse` that returns either the authed user or a 401 response.

## Acceptance criteria

- [ ] `/admin` shows the cup list (or an empty state CTA) instead of the Welcome placeholder.
- [ ] "Create cup" button navigates to `/admin/cups/new`; submitting a valid form creates a cup with status `draft` and navigates to `/admin/cups/:id`.
- [ ] Slug auto-fills from the cup name until the user edits it manually.
- [ ] Slug collisions surface as an inline error on the slug field (mock returns 409 with detail).
- [ ] All required-field and format validations block submit and show inline messages.
- [ ] Color pickers update the preview swatch live; saved cup has HSL-channel strings, not hex.
- [ ] On a draft cup, "Save and open registrations" saves the form and transitions status to `open`.
- [ ] Cup list reflects updates immediately (RTK Query cache invalidation).
- [ ] All UI strings come through `t()`; works in both `sv` and `en`.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:once`, `npm run build` all pass.

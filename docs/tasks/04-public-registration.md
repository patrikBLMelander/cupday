# Task 04 — Public Registration Form

## User Story

As a coach with a cup link from WhatsApp, I want to open `/c/<slug>/register`, fill in my club's contact info, type 1 or 2 team names, and submit — landing on the payment page so I know what to do next. If the cup is full or registration isn't open yet, I want a clear message so I don't waste time filling out the form.

## Goal

Wire the public registration flow end-to-end: a `RegistrationFormPage` at `/c/:slug/register` that creates 1–2 teams in `reserved` status via a public mock endpoint, then redirects to `/c/:slug/payment/:registrationId`. The payment page itself is still a stub (Task 05 fills it in).

## Scope

1. Domain types: `Team`, `TeamStatus`, `Registration`.
2. `teamsApi` RTK Query slice with the public `createRegistration` mutation. Other team endpoints (admin list, status updates, cancel) are deferred to Task 06.
3. `RegistrationFormPage` at `/c/:slug/register`:
   - Pre-flight: render "Registration not open" / "Cup is full" messages instead of the form when applicable.
   - Form: club name, contact name, contact email, contact phone, team name 1 (required), team name 2 (optional).
   - Built with `react-hook-form` (new dependency).
   - On submit success → navigate to `/c/:slug/payment/:registrationId`.
4. Mock backend: `POST /api/cups/:id/registrations` (no auth). Validates fields, checks team-name uniqueness within the cup, enforces `maxTeams`, auto-transitions cup status `open → full` when capacity is reached.
5. Replace the `ComingSoon` stub for `/c/:slug/register` with the real page.

## Out of scope

- Payment page content (Task 05).
- Admin team list / status transitions / group assignment (Task 06).
- Public team list rendering on the landing (Task 06).
- Email confirmations.
- CAPTCHA (accepted MVP risk per cup-mvp).

## Domain types

```ts
type TeamStatus = 'reserved' | 'paid' | 'cancelled';

type Team = {
  id: string;
  cupId: string;
  registrationId: string;
  name: string;
  clubName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  groupLabel: 'A' | 'B' | null;
  status: TeamStatus;
  createdAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
};

type Registration = {
  id: string;
  cupId: string;
  teamIds: string[];
  createdAt: string;
};

type RegistrationCreateRequest = {
  clubName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  teamNames: string[]; // length 1 or 2
};

type RegistrationCreateResponse = {
  registrationId: string;
  teamIds: string[];
};
```

## Mock API endpoints

### `POST /api/cups/:id/registrations` (public, no auth)

Request body: `RegistrationCreateRequest`.

Validation order:
1. Cup exists → else 404.
2. Cup status is `open` → else 422 with detail `"Registration is not open"`.
3. `teamNames.length` is 1 or 2 → else 400.
4. All required string fields non-empty + email matches `/^.+@.+\..+$/` → else 400 with the offending field in detail.
5. Two team names provided and equal → 400 with detail `"Team names must differ"`.
6. Each team name (case-insensitive trim) does not collide with any non-`cancelled` team in the same cup → else 409 with detail `"The name 'X' is already taken — add a number or color to keep teams apart"` and the conflicting name in `teamName` extension field.
7. Reserved+paid count + `teamNames.length` ≤ `maxTeams` → else 422 with detail `"Cup is full"`.

On success:
- Allocate one `Team` per name in `reserved` status with shared `registrationId` and `groupLabel: null`.
- Allocate the `Registration` row.
- If reserved+paid count after creation reaches `maxTeams`, transition `cup.status` to `full`.
- Return `RegistrationCreateResponse` with status 201.

## Pre-flight gates on the page

`RegistrationFormPage` reads the cup from `useOutletContext` (provided by `PublicLayout`). Before rendering the form:

- `cup.status === 'open'`:
  - if `reserved+paid count >= maxTeams` → "Cup is full" panel + back link.
  - else → render the form.
- `cup.status !== 'open'` → "Registration is not open" panel + back link.

The team count check needs the cup's current team list. Add a public `GET /api/cups/:id/teams` endpoint (returns only `reserved` and `paid` teams, never `cancelled`, and only the safe public fields: `id`, `name`, `groupLabel`, `status`). The page uses this both for the count and (later in Task 06) for the public Teams tab.

## Form (react-hook-form)

Fields:
- `clubName` — required.
- `contactName` — required.
- `contactEmail` — required, email regex.
- `contactPhone` — required.
- `teamName1` — required.
- `teamName2` — optional, **hidden by default**. Reveal via an "+ Add another team" button. When revealed, it gains a remove button (small "x" or "Remove") that hides the field again and clears its value. Must differ from `teamName1` (case-insensitive) when filled.

This keeps the single-team case visually clean — most clubs only register one team, and the second slot opts in.

Single submit button. On 409 from server, attach the error to the conflicting field (`teamName1` or `teamName2`) using `setError`. On 422 ("not open" / "full") render the corresponding pre-flight panel. On other failures, show a generic "_form" error.

After success, `navigate(\`/c/\${slug}/payment/\${registrationId}\`, { replace: true })`. The `replace` keeps the back button taking the visitor to the landing rather than back to the form.

## shadcn/ui components to add

None new. Reuse `Input`, `Label`, `Button`, `Card`, `Textarea` (not actually used here, but already available).

## Files to create

- `src/features/teams/teamTypes.ts` — types listed above + `PublicTeam` for the by-id GET response.
- `src/features/teams/teamsApi.ts` — RTK Query slice. Endpoints: `createRegistration`, `listPublicTeamsByCup`. Tag: `Teams`.
- `src/features/teams/RegistrationFormPage.tsx` — the page.

## Files to modify

- `src/mocks/db.ts` — type `teams: Team[]` and `registrations: Registration[]`.
- `src/mocks/handlers.ts` — add `POST /api/cups/:id/registrations` and `GET /api/cups/:id/teams`.
- `src/app/store.ts` — register `teamsApi`.
- `src/test/render.tsx` — register `teamsApi` in the test store.
- `src/app/routes.tsx` — replace `register` `ComingSoon` element with `<RegistrationFormPage />`.
- `src/locales/{sv,en}/translation.json` — `registration.*` keys.

## Dependencies

Add `react-hook-form ^7.x`. No zod yet.

## i18n keys

```
registration: {
  title,
  description,
  fields: {
    clubName, contactName, contactEmail, contactPhone,
    teamName1, teamName2, teamName2Hint
  },
  submit,
  cupNotOpen, cupFull, backToCup,
  validation: {
    required, emailInvalid, sameNames, nameTaken
  },
  generalFailure
}
```

## Tests

| File | Count | What |
|---|---|---|
| `teamsApi.test.ts` | 2 | (a) creates a registration with two teams in `reserved` status; (b) returns 409 on a team-name collision. |
| `RegistrationFormPage.test.tsx` | 2 | (a) renders the form for an `open` cup and submits successfully → navigates; (b) renders the "Cup not open" panel when status is `draft`. |

Tests seed the mock DB directly via `db.write` for the cup, then use the public endpoint without auth.

## Risks / notes

- **RHF + shadcn** — use the bare RHF with manual `<Input>` + `register()` plumbing (no `<Form>` wrapper component yet). Avoids pulling in `@hookform/resolvers` or zod for one form.
- **Status auto-transition** — the handler reads cup, mutates teams, rechecks count, mutates cup if needed. Single `db.write` updater that does it all atomically.
- **Public team count** — for the "is full" pre-flight check the page needs the current count. `useGetPublicTeamsByCupQuery(cup.id)` runs on mount; the form is hidden behind a tiny loading state until both queries settle.
- **Team-name normalization** — store names verbatim as the user typed them. Compare case-insensitively + after trimming whitespace for collision detection. Do NOT store a normalized form — preserve the user's casing for display.
- **Same-name check on the client** — RHF cross-field validation: `teamName2` validator gets `teamName1` from `getValues()` and rejects when equal (case-insensitive trim).
- **Concurrency** — two visitors registering simultaneously on the last spot: server's last-write-wins on `db.write` is fine for MVP (in-memory, single-process). Real backend handles this with DB constraints.
- **`replace: true` on navigate** — back button on payment page goes to the landing, not the form. Saves accidental double-submits.

## Acceptance criteria

- [ ] Visiting `/c/<slug>/register` for an `open` cup with capacity available renders the form.
- [ ] Visiting the same URL for a non-open cup renders the "Registration is not open" panel.
- [ ] Visiting when the cup is at capacity renders the "Cup is full" panel.
- [ ] Default form state shows one team-name input plus an "+ Add another team" button.
- [ ] Clicking the button reveals a second team-name input plus a "Remove" affordance that hides and clears it.
- [ ] Form validation blocks submit until all required fields and email format are valid.
- [ ] Two identical team names (case-insensitive) are blocked client-side with an inline error on `teamName2`.
- [ ] Submitting a colliding team name surfaces "The name 'X' is already taken — add a number or color" anchored to the offending field.
- [ ] Successful submit navigates to `/c/<slug>/payment/<registrationId>` (the payment route still renders the ComingSoon stub for now).
- [ ] After registration, the cup's team count increases. When the count hits `maxTeams`, the cup status auto-transitions to `full`.
- [ ] All UI strings via `t()`; works in both `sv` and `en`.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:once`, `npm run build` all pass.

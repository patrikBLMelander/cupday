# Cup MVP — Requirements

## Context

A web portal for football clubs to organize cups (tournaments). The first user is the project owner's own club, arranging their first cup for 8-year-olds in approximately 6 months. The MVP is built so that one real cup can run end-to-end on it, with the design generic enough that other clubs could re-use it later.

The frontend is built first with mocked APIs (MSW). A Java + Spring Boot backend will be added later, deployed alongside the frontend on Railway. Mock data shapes mirror what the Spring REST API will return so the swap is a `baseUrl` change.

## Primary User & Roles

- **Organizer** — the cup creator (you). Logs in with email + password. Manages cup settings, teams, schedule, and results.
- **Visitor** — anyone with the public cup link. No login. Can register team(s), view schedule, view standings.

## Goals

1. Organizer can create a cup and share a public link via WhatsApp.
2. Visitors can self-register up to 2 teams per submission via the public link.
3. Reserved teams see clear payment instructions (Digitala Lagkassan QR + link + fee).
4. Organizer can mark teams as paid, manage registrations, and close the cup when full.
5. Organizer can build a group stage schedule (8 teams in 2 groups, 2 pitches).
6. Public schedule view is mobile-first and themed in the organizing club's colors.
7. Swedish is the primary language; English is selectable.

## Non-Goals (explicit v2)

- **Score entry and standings.** Swedish FA rules disallow score-keeping for 9-year-olds; the MVP shows the schedule only.
- Knockout / playoff bracket on top of group stage.
- Automated payment processing (Lagkassan link is static config per cup).
- Email/push notifications.
- Invite flow targeting specific clubs (link sharing is enough).
- Multi-tenant signup for other organizers (only the project owner has admin login in MVP).
- Player rosters, photos, statistics.
- CAPTCHA / spam protection on the public form.
- Visitor self-cancellation. Teams contact the organizer to cancel; organizer cancels from admin.

## Stack (Confirmed)

- Vite + React 18 + TypeScript
- Redux Toolkit + RTK Query
- MSW for mock APIs (handlers backed by an in-memory store, persisted to `localStorage` in dev)
- Tailwind + shadcn/ui
- React Router v7
- Vitest + React Testing Library
- i18n: react-i18next, sv + en bundles
- Theming: CSS custom properties driven by per-cup color config

## Domain Model

```
Cup
  id, slug (used in public URL)
  name
  organizingClubName
  organizingClubColors { primary, accent }
  startDate, endDate
  venueName
  pitchCount (default 2)
  maxTeams (default 8, configurable)
  registrationFeeSek
  paymentInstructions (free text — shown on payment page)
  paymentLagkassanLink (URL)
  paymentLagkassanQrUrl (image URL)
  organizerContactName
  organizerContactEmail
  organizerContactPhone
  status: draft | open | full | scheduled | finished
  groupStageGroups: 2 (fixed for MVP)

Team
  id
  cupId
  name (unique per cup)
  clubName
  contactName
  contactEmail
  contactPhone
  groupLabel: A | B (assigned by organizer once paid)
  status: reserved | paid | cancelled
  createdAt
  paidAt | cancelledAt

Match
  id
  cupId
  groupLabel: A | B
  pitch: 1 | 2
  startTime
  homeTeamId
  awayTeamId
```

(No score, no standings, no `live`/`finished` status — Swedish FA rules disallow score-keeping for 9-year-olds. Whether a match is "now playing" vs "upcoming" is derived purely from `startTime` for display.)

## Public Pages (no login)

### `/c/:slug` — Cup landing page
- Cup name, organizing club, dates, venue, fee.
- Themed in organizer's colors.
- "Register team" call-to-action (visible while `status = open` and registrations < maxTeams).
- Tabs/sections: **Info**, **Teams**, **Schedule**.

### `/c/:slug/register` — Team registration form
- Fields: club name, contact name, contact email, contact phone, team name(s) (1 or 2).
- Team name is validated unique per cup on submit. On conflict, show clear feedback ("the name 'IFK' is already taken — add a number or color to keep teams apart") and let the user pick freely. Do not auto-suggest a name.
- Submit creates teams in `reserved` status and redirects to payment page.
- If cup is full, form is replaced by "Registration closed".

### `/c/:slug/payment/:registrationId` — Payment instructions
- Shows fee, payment instructions text, Lagkassan QR + link.
- Lists the team(s) just registered with `reserved` status.
- Includes a "to cancel, contact the organizer" line with the organizer contact (configured per cup).
- "I've paid" button is **not** in MVP — confirmation is organizer-side.

### `/c/:slug/schedule` — Public schedule
- Default view: by time, both pitches side by side.
- Filter: by group, by team.
- Mobile-first.

## Admin Pages (logged in)

### `/admin/login`
- Email + password.

### `/admin/cups` — Cup list
- Create new cup, edit existing.

### `/admin/cups/:id/settings`
- Edit all cup fields including `maxTeams` and Lagkassan link/QR.
- Status transitions (draft → open → full → scheduled → live → finished).

### `/admin/cups/:id/teams`
- List all teams with status filter.
- Mark `reserved` → `paid`.
- Cancel any team (organizer can override the "no refund after paid" rule manually if needed).
- Assign teams to groups A/B once paid (drag-drop or dropdown).

### `/admin/cups/:id/schedule`
- Generate a default schedule for 2 groups × 4 teams × 2 pitches (round-robin within each group).
- Edit individual matches (time, pitch, swap teams).
- Lock schedule once happy.

## Flows

### Registration → Payment
1. Visitor opens `/c/:slug` → clicks "Register team".
2. Fills form, sees live team-name uniqueness check.
3. Submits → backend (mock) creates team(s) in `reserved` status with a `registrationId` grouping them.
4. Redirect to `/c/:slug/payment/:registrationId`.
5. Visitor scans QR or follows Lagkassan link, pays externally.

### Payment Confirmation (organizer)
1. Organizer sees new `reserved` teams in `/admin/cups/:id/teams`.
2. Confirms payment landed in Lagkassan, clicks "Mark paid" → status `paid`.

### Cancellation
- Visitors cannot self-cancel. The payment page shows the organizer's contact info.
- Organizer cancels any team (reserved or paid) from `/admin/cups/:id/teams`.
- Cancelled teams' names are released for re-use.

### Schedule Generation
- 2 groups × 4 teams = 6 matches per group (round-robin) = 12 matches total.
- 2 pitches → 6 rounds → fits comfortably in one day with breaks.
- Default generator: alternate group A and group B across pitches per round to avoid same-group simultaneous play (and to keep referees moving sensibly).

## Theming

- Per cup: organizer picks a primary color and an accent color (color-picker + a few presets for common Swedish club colors).
- Implemented as CSS custom properties on `:root[data-cup-id="..."]` or scoped via React context + inline `style={{ '--primary': ... }}` on the root layout.
- shadcn/ui components consume these vars where possible; otherwise a small Tailwind config layer maps them.
- Public pages always themed; admin pages use a neutral default theme.

## i18n

- `react-i18next` with `sv` and `en` bundles from day one.
- Language switcher in the public header and admin header.
- Default to `sv`. Persist choice in `localStorage`.
- All user-facing strings go through `t()`.

## Acceptance Criteria

- [ ] Organizer can sign up / log in with email + password (mock auth — accept any email + password ≥ 6 chars in MVP; real auth comes with backend).
- [ ] Organizer can create a cup with all fields above and receive a shareable public link.
- [ ] Public landing page renders the cup info themed in the organizer's colors.
- [ ] Visitor can register 1 or 2 teams via the public form. On a duplicate team name, the form blocks submit and shows a clear "name already taken — add a number or color" message; the user picks the new name freely.
- [ ] After registration, visitor lands on the payment page with QR + link and the organizer's contact info for cancellations.
- [ ] Organizer can transition teams `reserved → paid → cancelled` from admin (reserved or paid teams can both be cancelled by the organizer).
- [ ] Cup hits `full` status automatically once `paid + reserved` count reaches `maxTeams`; further public registrations are blocked.
- [ ] Organizer can assign paid teams to groups A and B.
- [ ] Schedule generator produces a valid 12-match round-robin across 2 pitches; organizer can edit afterwards.
- [ ] Public schedule page is usable on a phone (≥ 360 px width).
- [ ] All copy is `t()`-wrapped; UI works in both `sv` and `en`.
- [ ] Mock data persists across page reloads via `localStorage`.

## Open Items / Decisions Recorded

- **Team-name uniqueness** — user picks the name; on duplicate, the form blocks submit and shows a clear conflict message ("the name 'IFK' is already taken — add a number or color to keep teams apart"). No auto-suggestion.
- **No score entry / no standings** — Swedish FA disallows score-keeping for 9-year-olds. Schedule only.
- **Visitor cancellation is organizer-mediated** — payment page shows the organizer's contact info; organizer cancels from admin.
- **Mock auth** — single hardcoded organizer email accepted, no real registration in MVP. Replace with backend auth once Spring Boot lands.
- **No CAPTCHA** — accepted spam risk for the WhatsApp-only audience.
- **No automated payment confirmation** — organizer manually flips status. This is intentional to avoid Lagkassan integration complexity.

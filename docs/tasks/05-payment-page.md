# Task 05 — Payment Page

## User Story

After submitting the registration form, I want to land on a page that confirms my team(s) are reserved, shows the fee, gives me clear payment instructions plus the Lagkassan QR / link to actually pay, and tells me how to reach the organizer if I need to cancel.

## Goal

Wire `/c/:slug/payment/:registrationId` end-to-end. Replace the `ComingSoon` stub with a real page that fetches the registration, displays the reserved team(s), payment info from the cup, and the organizer's contact info.

## Scope

1. New public endpoint `GET /api/registrations/:id` returning `{ registration, teams: PublicTeam[] }` (no contact info on teams; the visitor's own contact info isn't needed here).
2. `getRegistration` query on `teamsApi`.
3. `PaymentPage` at `/c/:slug/payment/:registrationId`:
   - "Thanks" heading + reassuring copy.
   - Card showing the registered team name(s) with a "reserved" badge each.
   - Card showing the fee and free-text `paymentInstructions`, plus the Lagkassan QR image + link to open Lagkassan.
   - Card with the cancellation note: "To cancel, contact the organizer" + the cup's organizer contact (name + email + phone, with `mailto:` and `tel:`).
   - "Back to cup" link.
4. 404 state when the registrationId doesn't resolve (stale/typed-wrong URL).
5. Replace the `ComingSoon` stub in `src/app/routes.tsx`.

## Out of scope

- "I've paid" button — payment confirmation stays organizer-side (Task 06 admin teams page).
- Email confirmations.
- Editing the registration after submit.
- Anything Lagkassan-specific beyond rendering the configured URL + QR image.
- Status auto-transitions on this page (server already auto-transitioned cup → `full` if applicable when the registration was created in Task 04).

## Mock API endpoint

### `GET /api/registrations/:id` (public, no auth)

Response shape:
```ts
{
  registration: { id, cupId, teamIds, createdAt },
  teams: PublicTeam[]   // only the teams belonging to this registration
}
```

404 when the id doesn't match a row. Don't leak existence info beyond that.

## Page layout

Reads the cup from `useOutletContext` (PublicLayout already provides it). Reads the registration via `useGetRegistrationQuery(registrationId)`.

```
[Heading]   "Tack för anmälan!" / "Thanks for your registration!"
[Subhead]   "Säkra platsen genom att betala anmälningsavgiften."

[Card 1: Registered teams]
  - One row per team in the registration: name + "Reserved" badge.

[Card 2: Payment]
  - Fee:   "500 SEK"
  - Instructions: free text from cup.paymentInstructions
  - Lagkassan QR (img with alt text)
  - Button asChild → <a href={paymentLagkassanLink} target="_blank">Open Lagkassan</a>

[Card 3: Cancellation]
  - Body copy: "To cancel before paying, contact the organizer."
  - Organizer name + clickable email (mailto) + clickable phone (tel)

[Back to cup link]
```

QR image: simple `<img src={cup.paymentLagkassanQrUrl} alt={t('payment.qrAlt')} />` constrained to a sensible size (e.g. `max-w-48 sm:max-w-56`).

If `cup.paymentLagkassanQrUrl` is empty, omit the image but still show the link button. If `cup.paymentLagkassanLink` is also empty, omit the link button entirely (the instructions text takes over).

## Files to create

- `src/features/teams/PaymentPage.tsx`
- `src/features/teams/PaymentPage.test.tsx`

## Files to modify

- `src/features/teams/teamsApi.ts` — add `getRegistration` query. Tag: `Registration` (per-id).
- `src/mocks/handlers.ts` — add the GET endpoint.
- `src/app/routes.tsx` — swap the `payment/:registrationId` `ComingSoon` for `<PaymentPage />`.
- `src/locales/{sv,en}/translation.json` — `payment.*` keys.

Tag types on `teamsApi` extend to `['Teams', 'Cup', 'Cups', 'Registration']`. The `createRegistration` mutation invalidates any future Registration queries (no-op for now since the query is invoked after the navigate, but keeps caches honest).

## i18n keys

```
payment: {
  title,
  subtitle,
  teamsCard: { title, statusReserved },
  paymentCard: {
    title, fee, instructions,
    qrAlt, openLagkassan
  },
  cancelCard: {
    title, body,
    contactEmail, contactPhone
  },
  backToCup,
  notFound: { title, body }
}
```

## Tests

| File | Count | What |
|---|---|---|
| `PaymentPage.test.tsx` | 2 | (a) renders team names + Lagkassan link for a known registrationId; (b) renders the not-found panel for a stranger id. |
| (extend) `teamsApi.test.ts` | 0 | Reuse the existing happy-path test — assert against the registration via the new query in the same flow. (Optional polish, skip if proportional rule pushes against it.) |

Skip the optional teamsApi extension — the new query is straightforward and covered indirectly by the page test.

## Risks / notes

- **Stale registration URLs** — once the visitor leaves, the URL is the only way back. Acceptable for MVP since the visitor's job is to pay externally and then close the tab. Organizer side (Task 06) tracks the registration regardless.
- **No `useEffect` needed** — registration status / team list comes from the query; render directly.
- **QR + link both optional** — defensive rendering on missing fields. The `paymentInstructions` text remains the always-visible payment information.
- **Theme already applies** — PublicLayout's CSS-var override wraps this page; cards and links pick up cup colors.
- **Same-origin policy** — Lagkassan link opens in a new tab via `target="_blank"` + `rel="noopener noreferrer"`.

## Acceptance criteria

- [ ] Submitting the registration form (Task 04) lands on `/c/<slug>/payment/<registrationId>` with the page populated.
- [ ] Each registered team shows in the "Registered teams" card with a "Reserved" badge.
- [ ] Payment card shows the fee, instructions text, Lagkassan QR image (when present), and "Open Lagkassan" link (when present).
- [ ] Cancellation card shows the organizer's name, email (mailto), and phone (tel).
- [ ] "Back to cup" link returns to `/c/:slug`.
- [ ] Visiting `/c/:slug/payment/<unknown-id>` shows a "Registration not found" panel with a back-to-cup link.
- [ ] All strings via `t()`; works in both `sv` and `en`.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:once`, `npm run build` all pass.

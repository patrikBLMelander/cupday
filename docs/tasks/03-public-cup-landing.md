# Task 03 — Public Cup Landing

## User Story

As anyone with a cup's link (parents, visiting teams, the organizer's WhatsApp group), I want to open `/c/<slug>` and see a clean, mobile-friendly page themed in the organizing club's colors, showing the cup's basic info — and tabs for Teams and Schedule that will fill in as later tasks land.

## Goal

Stand up the public-facing surface: routing under `/c/:slug`, a `PublicLayout` that fetches the cup by slug and applies its colors as CSS variables, and a `PublicCupLandingPage` with three tabs (Info, Teams, Schedule). After this task, every later public-facing feature (registration, payment, public schedule) plugs into the same layout and theming.

## Scope

1. `PublicLayout` at `/c/:slug` — fetches the cup, applies theming via CSS vars on the wrapper, renders a public header (cup name + `LanguageSwitcher`).
2. `PublicCupLandingPage` (the index route) — three-tab layout (Info / Teams / Schedule).
3. Tabs:
   - **Info** — dates, venue, registration fee, organizer contact (name + email + phone), payment instructions snippet. "Register team" CTA link wired to `/c/:slug/register` (route exists as a placeholder for Task 04).
   - **Teams** — placeholder ("Teams will appear here once registrations open").
   - **Schedule** — placeholder ("Schedule will appear once it's published").
4. Loading and 404 states for invalid/missing slugs.
5. Cup is provided to nested routes via React Router's `Outlet` context (no extra context provider), so Tasks 04–08 can read it without re-fetching.
6. Stub routes for `/c/:slug/register`, `/c/:slug/payment/:registrationId`, `/c/:slug/schedule` rendering a "Coming soon" placeholder. They get filled in by later tasks.

## Out of scope

- Registration form behavior (Task 04).
- Payment page content (Task 05).
- Public schedule rendering (Task 08).
- Real teams list (Task 06 owns the data; this task only wires the empty-state copy).
- Color contrast adjustment on the foreground text — accept the user's chosen colors as-is for MVP. Document as v2.

## Theming approach

The default theme tokens in `index.css` define `--primary` and `--accent` as HSL channels. `PublicLayout` overrides those two variables on its root wrapper so any descendant component using `bg-primary`, `text-primary`, `border-accent`, etc. picks up the cup's colors automatically.

```tsx
<div
  className="min-h-screen bg-background text-foreground"
  style={{
    '--primary': cup.organizingClubColors.primary,
    '--accent': cup.organizingClubColors.accent,
  } as CSSProperties}
>
  ...
</div>
```

`--primary-foreground` is left at its default near-white, since most reasonable club-color choices are saturated enough for white text. If the user picks a pale primary, foreground text will be unreadable — accepted MVP risk; v2 can compute foreground from luminance.

## shadcn/ui components to add

`tabs`. Run `npx shadcn@latest add tabs --yes`.

## Files to create

- `src/app/layouts/PublicLayout.tsx` — fetches cup via `useGetCupBySlugQuery`, handles loading + 404, applies theming, renders header + `<Outlet context={{ cup }} />`.
- `src/features/cups/PublicCupLandingPage.tsx` — the tab UI; reads cup from `useOutletContext`.
- `src/features/cups/CupNotFoundPage.tsx` — minimal 404 page used by `PublicLayout` when the slug doesn't resolve.

## Files to modify

- `src/app/routes.tsx` — add the `/c/:slug` route tree:
  - index → `PublicCupLandingPage`
  - `register` → placeholder element (filled in Task 04)
  - `payment/:registrationId` → placeholder element (filled in Task 05)
  - `schedule` → placeholder element (filled in Task 08)
- `src/locales/sv/translation.json` and `en/translation.json` — `public.*` keys (see below).

## i18n keys (add)

```
public.tabs: { info, teams, schedule }
public.info: {
  dates, venue, fee, organizer, contactName, contactEmail, contactPhone,
  paymentInstructions, registerCta, registrationsClosed
}
public.empty: { teams, schedule }
public.notFound: { title, body, backHome }
public.placeholder: { comingSoon }
```

## Tests

| File | Count | What |
|---|---|---|
| `PublicLayout.test.tsx` | 1 | Renders the cup name in the header when the slug resolves; renders `CupNotFoundPage` when it doesn't. (Two assertions in one test.) |
| `PublicCupLandingPage.test.tsx` | 1 | Renders all three tab triggers and switches the visible panel when a tab is clicked. |

Tests seed the mock DB directly via `db.write` (no auth needed — the public endpoint doesn't require a token).

## Risks / notes

- **Outlet context typing** — wrap `useOutletContext<{ cup: Cup }>` in a small `useCupOutletContext` hook for ergonomic typing. Keep it inside `PublicLayout.tsx` (one-off, no separate file).
- **Theming wrapper must come before any components using primary/accent** — that's how CSS-var overrides cascade. The wrapper element has the inline style; all children render inside it.
- **Public endpoint is unauthenticated** — already correct (handler doesn't call `requireAuth`). Verify nothing in the public path inadvertently triggers admin-only requests.
- **Register CTA visibility** — show only when `cup.status === 'open'`. For other statuses (`draft`, `full`, `scheduled`, `finished`) show a small text "Registrations closed" or status-specific copy.
- **shadcn `tabs`** ships its own focus + keyboard handling — no extra a11y work needed.
- **Mobile-first** — single-column on small screens; widen on `sm:` breakpoint. The layout already uses Tailwind's mobile-first defaults.

## Acceptance criteria

- [ ] `/c/<existing slug>` renders the cup landing page with the cup's name in the header.
- [ ] The page is themed in the cup's primary + accent colors (verified by inspecting the wrapper's CSS vars).
- [ ] Three tabs render: Info (default selected), Teams, Schedule. Clicking a tab switches the visible panel.
- [ ] Info tab shows dates, venue, fee, organizer contact, payment instructions snippet.
- [ ] When `cup.status === 'open'`, a "Register team" button links to `/c/<slug>/register`.
- [ ] When `cup.status` is anything else, a "Registrations closed" text is shown instead.
- [ ] `/c/<unknown slug>` renders a 404 page with a link back to `/`.
- [ ] `LanguageSwitcher` is in the public header and toggles `sv`/`en`.
- [ ] All UI strings come through `t()`.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:once`, `npm run build` all pass.

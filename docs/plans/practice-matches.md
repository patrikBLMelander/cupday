# Plan: Träningsmatcher

Underlag: designcanvas https://claude.ai/artifact/Pw6SUNeKor8rwc4EphsexB (6d "Gräsplan" ljust + 7a–7i mörkt läge och mobil).
Status: godkänd 2026-10-03. Fas 1 (backend) implementerad på branch `feature/practice-matches`, `mvnd verify` grön.

Beslut 2026-10-03: direkt bokning (först till kvarn, arrangören kan ta bort bokningar) · arrangörens kontaktuppgifter syns öppet · ålder = kön (P/F/Mix) + födelseår.

## Mål

En öppen anslagstavla där vem som helst kan lägga upp en träningsmatch och söka motstånd, och där andra lag bokar lediga platser. Helt utan konto.

- Separat från cuperna: egen modul i backend, egna tabeller, egen route och layout i frontend.
- Flödet byggs så att cuper senare kan visas som kort i samma kronologiska lista (se Fas 3).

## Datamodell — nya tabeller (V12__practice_matches.sql)

Inga ändringar i befintliga tabeller. Inga FK till `cup`, `team` eller `app_user`.

### `practice_match`

| Kolumn | Typ | Krav | Kommentar |
|---|---|---|---|
| id | UUID PK | | |
| team_name | TEXT | NOT NULL | "Ekens IF F11" |
| gender | TEXT | NOT NULL, CHECK IN ('P','F','MIX') | |
| birth_year | INTEGER | NOT NULL, CHECK 1990–2030 | P13 = pojkar födda 2013 |
| level | SMALLINT | NOT NULL, CHECK 1–9 | 1 = Lätt− … 9 = Svår+ |
| players_per_side | INTEGER | NOT NULL, CHECK IN (5,7,9,11) | spelform |
| kickoff_at | TIMESTAMPTZ | NOT NULL | datum + tid |
| venue | TEXT | NOT NULL | plats |
| opponent_slots | INTEGER | NOT NULL DEFAULT 1, CHECK 1–5 | fler än 1 = minimatch-dag |
| contact_name | TEXT | NOT NULL | |
| contact_phone | TEXT | NOT NULL | |
| contact_email | TEXT | NOT NULL | |
| cost_sek | INTEGER | NULL, CHECK >= 0 | **valfri** – kostnad per lag, NULL = ej angivet |
| notes | TEXT | NULL | **valfri** – övrig info |
| manage_token_hash | TEXT | NOT NULL | SHA-256 av hemlig hanteringsnyckel |
| status | TEXT | NOT NULL, CHECK IN ('ACTIVE','CANCELLED') | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| cancelled_at | TIMESTAMPTZ | NULL | |
| version | BIGINT | NOT NULL DEFAULT 0 | optimistisk låsning |

Index: `(status, kickoff_at)` för listan "kommande matcher".

### `practice_match_booking`

| Kolumn | Typ | Krav | Kommentar |
|---|---|---|---|
| id | UUID PK | | |
| match_id | UUID | NOT NULL FK → practice_match ON DELETE CASCADE | |
| team_name | TEXT | NOT NULL | bokande lag |
| contact_name / contact_phone / contact_email | TEXT | NOT NULL | |
| message | TEXT | NULL | valfritt meddelande till arrangören |
| manage_token_hash | TEXT | NOT NULL | så att bokaren kan avboka |
| status | TEXT | NOT NULL, CHECK IN ('BOOKED','CANCELLED') | |
| created_at / cancelled_at | TIMESTAMPTZ | | |

Index: `(match_id)`. Partiellt unikt index `(match_id, LOWER(team_name)) WHERE status = 'BOOKED'` – samma lag kan inte boka två platser i samma match.

Lediga platser = `opponent_slots − antal BOOKED` (beräknas, lagras inte). Bokning låser matchraden med `PESSIMISTIC_WRITE` (samma mönster som cupregistreringen) så att två lag inte kan ta sista platsen samtidigt.

## Utan konto: hanteringslänk

- Vid `POST` av match eller bokning genereras en slumpad nyckel (32 byte, base64url). Svaret innehåller nyckeln en gång, och i DB lagras bara hashen.
- Frontend visar en "Spara den här länken"-ruta (`/matcher/{id}/hantera#nyckel`) och sparar nyckeln i `localStorage`. Då dyker matchen upp under "Mina upplagda" i samma webbläsare.
- Med nyckeln (header `X-Manage-Token`) kan arrangören ändra eller ställa in matchen och se bokarnas kontaktuppgifter. Bokaren kan avboka sin bokning.
- Admin (befintlig inloggning) kan ta bort matcher (moderering/spam).
- Längre fram när e-post finns: skicka länken via mejl. Ingen e-post finns i projektet idag.

## Backend (`com.cup.backend.practicematches`)

Filer: `PracticeMatch`, `PracticeMatchBooking`, `PracticeMatchStatus`, `BookingStatus`, repositories, `PracticeMatchDtos`, `PracticeMatchService`, `ManageTokenService`, `PracticeMatchController`, `AdminPracticeMatchController`, exceptions (`PracticeMatchNotFound`, `MatchFull`, `BookingNameConflict`, `InvalidManageToken`, `MatchInPast`), + `GlobalExceptionHandler`-handlers.

| Metod | Endpoint | Auth |
|---|---|---|
| GET | `/api/practice-matches?from=&to=` | öppen – kommande aktiva matcher, sorterade på `kickoff_at` |
| GET | `/api/practice-matches/{id}` | öppen |
| POST | `/api/practice-matches` | öppen → `{ match, manageToken }` |
| PUT | `/api/practice-matches/{id}` | `X-Manage-Token` |
| DELETE | `/api/practice-matches/{id}` | `X-Manage-Token` (status → CANCELLED) |
| GET | `/api/practice-matches/{id}/manage` | `X-Manage-Token` – inkl. bokarnas kontaktuppgifter |
| POST | `/api/practice-matches/{id}/bookings` | öppen → `{ booking, manageToken }` |
| DELETE | `/api/practice-matches/{id}/bookings/{bookingId}` | bokarens eller arrangörens nyckel |
| DELETE | `/api/admin/practice-matches/{id}` | JWT (admin) |

- Den öppna listan visar arrangörens kontaktuppgifter och namnen på de lag som bokat, men inte bokarnas kontaktuppgifter.
- Validering: alla fält obligatoriska utom `costSek`, `notes` och `message`. E-postformat, kickoff i framtiden och spelform ∈ {5,7,9,11}.
- Filtrering (nivåspann, ålder, spelform, lediga, lagnamn) görs i klienten i MVP – datamängden är liten. "Mina matcher" via lagnamn matchar både arrangörens och de bokande lagens namn (bokade lagnamn skickas med i listan).
- Spamskydd: honeypot-fält i formulären och en enkel rate limit per IP på POST-anropen.
- `SecurityConfig` behöver ingen ändring (`anyRequest().permitAll()`; `/api/admin/**` kräver redan inloggning).
- Tester: `PracticeMatchServiceTest` (bokning när det är fullt, fel nyckel, avbokning frigör plats) + `PracticeMatchControllerIT` (Testcontainers, happy path skapa → boka → hantera).

## Frontend (`src/features/practiceMatches/`)

### Routes och layout
- `/matcher` – listan (desktop: lista/kort-växel; mobil: kortlista + filterblad)
- `/matcher/ny` – lägg upp match
- `/matcher/:id` – match och bokning
- `/matcher/:id/hantera` – arrangörsvy (nyckeln läses från `#hash`, sparas i localStorage)
- `PracticeLayout` med eget sidhuvud (Din Cup / Träningsmatcher, ljust/mörkt-knapp, "Lägg upp match"). Länk från startsidan.

### Tema
- Gräsplan-temat som CSS-variabler i `index.css`, scopat under `.theme-grass` och `.theme-grass.dark`. Det påverkar inte cupsidorna.
- Mörkt läge: följer systemet som standard, kan växlas manuellt, och valet sparas i localStorage.
- Typsnitt: Bricolage Grotesque (rubriker) + DM Sans (text) via Google Fonts.

### Komponenter
`PracticeMatchListPage`, `DateStrip`, `FilterBar` (desktop) / `FilterSheet` (mobil), `MatchRow`, `MatchCard`, `LevelMeter` (9 streck), `SlotsBar`, `PracticeMatchDetailPage` + `BookingForm`, `PracticeMatchFormPage` (används för både skapa och redigera), `ManagePage`, `ManageLinkNotice`.

- `levels.ts`: 1–9 ↔ "Lätt−"…"Svår+" (i18n-nycklar).
- `practiceMatchesApi.ts` (RTK Query, samma mönster som `cupsApi`), MSW-handlers + mock-data för utveckling utan backend.
- Formulär med react-hook-form och samma regler som backend. Kostnad: valfritt heltal i kr, visas som "Kostnad: 200 kr/lag" eller "Gratis" om man anger 0.
- Listan har typen `FeedItem = { kind: 'match', … } | { kind: 'cup', … }` från start, så att cupkort kan läggas in i Fas 3 utan omskrivning.
- Översättningar sv + en.
- Tester: filterlogik (nivåspann, lagnamn som arrangör/motståndare, bara lediga), gruppering per dag/sortering, formulärvalidering.

## Faser

1. **Backend** – migration, entiteter, tjänst, endpoints, tester (`mvnd verify`).
2. **Frontend** – tema + layout → lista (datumremsa, filter, lista/kort) → detalj + bokning → skapa/redigera → hantera → MSW + tester (`npm run typecheck && npm run test:once && npm run lint`).
3. **Senare (ej i denna omgång)** – cuper i flödet: öppna cuper (befintligt `/api/cups/public`) visas som ett snyggt kort på startdatum, med länk till `/c/:slug`. Ingen ny tabell behövs. E-postutskick av hanteringslänk och notis vid bokning.

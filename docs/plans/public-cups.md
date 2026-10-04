# Plan: Lägg upp cup utan konto

Underlag: canvas 8a–8g (https://claude.ai/artifact/Pw6SUNeKor8rwc4EphsexB). Godkänd 2026-10-04 (cuper syns direkt; spelschema via adminlänk senare). Fas 1–3 implementerade, ej committade.

## Princip

En upplagd cup är en **vanlig cup** i tabellen `cup`, så den automatiskt får den publika cupsidan `/c/:slug`, anmälan, betalningssidan, listan på startsidan och (senare) spelschemat. Skillnaden är att den hanteras med en **adminlänk** (hemlig nyckel, hash i DB) i stället för inloggning – samma modell som träningsmatcherna. Befintliga admin-skapade cuper påverkas inte.

## Databas (V15)

`cup` får nya kolumner (alla bakåtkompatibla):

| Kolumn | Typ | Kommentar |
|---|---|---|
| manage_token_hash | TEXT NULL | satt för publikt upplagda cuper |
| end_time | TIME NULL | sluttid varje dag (start_time finns redan) |
| age_classes | TEXT NOT NULL DEFAULT '' | "P13,P14" |
| level_min / level_max | SMALLINT NULL | nivåspann 1–9 för visning/filter |
| registration_deadline | DATE NULL | sista anmälningsdag |
| external_registration_url | TEXT NULL | "Egen anmälningslänk" – då anmäls inte lag via Din Cup |

`players_per_team` CHECK utökas till (5, 7, 9, 11).

Ny tabell `cup_level_quota (cup_id FK ON DELETE CASCADE, level TEXT, max_teams INT, PK(cup_id, level))` för valfria låsta platser per nivå. När kvoter finns sätts `use_levels = true` och `levels` = kvotnivåerna, så befintlig anmälan med nivå fungerar; registreringen kontrollerar dessutom kvoten.

## Backend

- `POST /api/cups` (öppen): skapar cup med status OPEN, auto-slug från namnet, standardfärger, `pitch_count` 1. Samtycke + honeypot + rate limit som för matcher. Svar `{ cup, manageToken }`.
- `GET /api/cups/{id}/manage` (adminlänk): cup + alla lag med kontaktuppgifter, betalstatus och nivå.
- `PATCH /api/cups/{id}/manage`: redigera cupens uppgifter (inkl. betalningslänk/text, kvoter).
- `PATCH /api/cups/{id}/manage/teams/{teamId}`: markera betald/ej betald/avanmäld (återanvänder `AdminTeamService`).
- `DELETE /api/cups/{id}/manage`: ställ in cupen.
- Publika cupen (`/by-slug`, `/public`) får de nya fälten + `levelQuotas: [{ level, maxTeams, remaining }]`.
- Registrering: nivå krävs när kvoter finns; full nivå → 422.
- Datalagring: publikt upplagda cuper raderas 30 dagar efter sista cupdagen (samma nattliga jobb).
- Moderering: syns i befintliga admin-cuplistan (märkt "Upplagd publikt") där admin kan ta bort.

## Frontend

- **Flödet** (`/matcher`, döps till "Matcher & cuper"): knapparna "Lägg upp cup" + "Lägg upp match", på mobil ett val-blad (8d). Filter Allt / Matcher / Cuper. Cuper som guldkort på startdagen (8a/8c) och en "pågår – dag 2 av 2"-rad följande dagar; pokal i datumremsan. Filtren för ålder/nivå/spelform/lediga gäller även cuper.
- **Lägg upp cup** (`/matcher/ny-cup`, 8e): alla fält enligt mocken inkl. start-/sluttid, klasser, nivåspann, valfria låsta platser per nivå, betalningslänk/text, anmälan via Din Cup eller egen länk.
- **Adminlänken – extra tydligt** (önskemål):
  1. Info-ruta i formuläret innan publicering.
  2. Efter publicering en **egen helsidesvy** "Spara din adminlänk" som måste kvitteras (mejla till mig / dela / kopiera / "Jag har sparat länken") innan man kommer vidare till adminsidan.
  3. Mejlet (mailto) och delningen förklarar vad länken används till: se anmälda lag, markera betalt, ändra cupen.
  4. Länken sparas i webbläsaren och visas under "Dina upplagda" i flödet.
- **Cupens adminsida** (`/matcher/cup/:id/hantera`, 8g): siffror anmälda/betalda/obetalda, filter Obetalda, lag per nivå med reglage Betald, betalningsinfo med "Ändra", redigera, ställ in.
- **Publika cupsidan** `/c/:slug` (8f): tid från–till, klasser, platser per nivå med staplar, nivåval i anmälan med platser kvar (full nivå ej valbar), betalningslänk/text efter anmälan. Egen anmälningslänk → knappen länkar ut.
- **Startsidan** (8b): "Lägg upp din cup" i toppen och guldrutan längst ner.

## Faser

1. Backend: migration, publik skapa/hantera-API, kvoter i registrering, retention, tester.
2. Frontend: skapa-cup + adminlänk-flödet + cupens adminsida.
3. Frontend: cuper i flödet + publika cupsidan (kvoter, tider) + startsidan.

## Senare

- Spelschema via adminlänken (befintlig generator, men bakom inloggning idag).
- Mejlutskick av adminlänken (kräver mejltjänst).

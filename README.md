# Oceniator v2

Oceniator v2 to aplikacja React + Vite + TypeScript do oceny jakosci obslugi w kanalach
rozmow, maili i dzialan systemowych. Obecny kierunek produktu to portal jakości z
logowaniem przez Supabase Auth + Google OAuth, wdrażany przez Vercel, z RLS i audytem po
stronie Supabase. Glowne UI jest uruchamiane z rootowego `index.html`, a poprzednia
aplikacja statyczna zostala zachowana w `legacy/` jako fallback referencyjny.

## Uruchomienie lokalne

```powershell
npm install
npm run dev
```

Nastepnie otworz adres pokazany przez Vite, domyslnie:

```text
http://127.0.0.1:5173/
```

Jesli pracujesz z Supabase, skopiuj `.env.example` do lokalnego `.env` i uzupelnij
`VITE_SUPABASE_URL` oraz `VITE_SUPABASE_ANON_KEY`.

## Build i weryfikacja

```powershell
npm run build
npm run lint
npm run test
```

Rootowe skrypty buduja i sprawdzaja aplikacje React. Poprzedni wariant legacy nie jest juz
glownym entrypointem produkcyjnym.

## Routing

Aplikacja nie uzywa `react-router`. Nawigacja jest trzymana w hashu URL i parsowana przez
`app/src/lib/locationHash.ts`.

- `#start` otwiera ekran startowy.
- `#form?type=r` otwiera formularz dla typu `r`, `m` albo `s`.
- `#registry?preset=all` otwiera ewidencje z presetem filtrow.
- `#registry?preset=recent&focus=<assessmentId>` dodatkowo ustawia fokus na konkretnej karcie.

Warstwa routingu jest rozdzielona tak:

- `app/src/config/navigation.ts` trzyma dostepne widoki i metadane nawigacji,
- `app/src/lib/locationHash.ts` buduje i odczytuje stan lokalizacji,
- `app/src/App.tsx` pilnuje zgodnosci miedzy uprawnieniami uzytkownika, stanem widoku i hashem.

Jesli dodajesz nowy widok, zaktualizuj wszystkie trzy miejsca, zamiast dopisywac
warunkowa nawigacje tylko w jednym komponencie.

## Pierwsza prezentacja

Pokazuj po kolei:

1. Zalogowanie.
2. Start, Dashboard i Ewidencje.
3. Widok `viewer` oraz ograniczenie zakresu danych.
4. Panel admina z `Ostatnie zmiany`.
5. Logout i odswiezenie, zeby pokazac, ze sesja i zapis sa trwale.

## Integracja Supabase

Rzeczywisty harness przeciwko stagingowemu Supabase jest opisany w `SUPABASE_INTEGRATION.md`.
Po ustawieniu sekretow uruchom:

```powershell
npm run test:integration
```

Suite sprawdza logowanie admina, RLS dla `viewer` i `leader`, zapis kart oraz zapis audytu.
Docelowe logowanie użytkownika w produkcji odbywa się przez `Supabase Auth` z providerem Google.

Minimalne zmienne do uruchomienia suite:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_TEST_ADMIN_EMAIL`
- `SUPABASE_TEST_ADMIN_PASSWORD`

Opcjonalnie, ale zalecane:

- `SUPABASE_TEST_VIEWER_EMAIL`
- `SUPABASE_TEST_VIEWER_PASSWORD`
- `SUPABASE_TEST_LEADER_EMAIL`
- `SUPABASE_TEST_LEADER_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deployment

Projekt jest przygotowany pod `Vercel`.

- rootowy build nadal wychodzi przez `npm run build` do `dist/`,
- `vercel.json` wskazuje build output,
- deployment produkcyjny i preview powinny być zarządzane przez integrację Vercel z repo albo przez bezpośredni deploy z aktualnej gałęzi,
- dla logowania Google dodaj w Supabase Dashboard provider `Google` oraz allowlistę redirect URL dla środowisk `local`, `staging` i `production`.

## Diagnostyka i start

- Panel administratora pokazuje ostatnie zmiany konfiguracji oraz ostatnie zdarzenia aplikacji.
- Lista startowa i checklista wdrozeniowa sa w `LAUNCH_CHECKLIST.md`.
- Runbook pilota i kryteria go/no-go sa w `PILOT_RUNBOOK.md`.
- Po zmianach uruchom:

```powershell
npm run build
npm run lint
npm run test
npm run smoke
```

- Przed pilotażem sprawdz, czy szkic wraca po odswiezeniu, czy audyt zapisuje zmiany i czy role widza poprawnie ograniczaja zakres danych.

## Tryby danych

- Domyslnie aplikacja probuje uzyc Supabase przez `app/src/data/supabaseProvider.ts`.
- Tryb lokalny jest dostepny tylko w srodowisku `local`.
- W produkcji i stagingu UI korzysta z Supabase, a logowanie idzie przez Google OAuth.
- Dane lokalne v2 uzywaja kluczy `oc_v2_*` tylko w trybie demo i nie sa zrodlem prawdy dla produkcji.
- W trybie Supabase dane biznesowe, w tym oceny, szkice, komentarze i powiadomienia, sa zapisywane w zewnetrznej bazie.

## Supabase

Schemat bazy i skrypty pomocnicze sa w katalogu `supabase/`:

- `schema.sql` - bazowy schemat tabel.
- `rls_hardening.sql` - polityki RLS i funkcje pomocnicze.
- `fix_profile_role_update.sql` - RPC do bezpiecznej aktualizacji profili.
- `functions/admin-users/` - Edge Function do tworzenia kont Auth z panelu admina.

Konfiguracja klienta React jest w `app/src/data/supabaseProvider.ts` i moze byc nadpisana
zmiennymi `VITE_APP_ENV`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` oraz `VITE_SUPABASE_ENABLED=false`.
Klucza `service_role` nie wolno dodawac do frontendu.

## Struktura

- `index.html` - rootowy entrypoint React/Vite.
- `app/src/App.tsx` - glowne widoki: login, start, formularz, ewidencja, dashboard, raporty, admin oraz synchronizacja hash-routingu.
- `app/src/domain/` - typy, definicje formularzy i logika scoringu.
- `app/src/data/` - providery danych local/Supabase i seed demo.
- `app/src/lib/locationHash.ts` - parser i builder stanu routingu opartego o hash URL.
- `legacy/` - poprzedni statyczny shell jako fallback referencyjny.
- `supabase/` - schemat, polityki i Edge Function.

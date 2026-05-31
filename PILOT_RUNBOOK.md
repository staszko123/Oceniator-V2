# Pilot runbook

Dokument do pierwszego uruchomienia portalu u wspolpracownikow. Ma byc prosty: co sprawdzic, co zbackupowac, co odtworzyc i kiedy nie puszczac dalej.

## Cel pilota

- zweryfikowac czy uzytkownik rozumie ekran po wejściu,
- potwierdzic, ze role i widocznosc danych dzialaja poprawnie,
- sprawdzic czy zapis, odswiezenie i audyt nie gubia danych,
- wychwycic miejsca, w ktorych ktos sie zatrzymuje.

## Co musi byc gotowe przed pilotem

- `npm run build`
- `npm run lint`
- `npm test -- --run`
- `npm run smoke`
- `npm run test:integration` - jesli jest staging Supabase
- minimalny browser smoke: login -> Start/Dashboard -> Ewidencja -> Logout
- login dziala dla kont testowych
- `viewer` widzi tylko swoje oceny
- `admin_history` zapisuje zmiany administracyjne

## Backup

Przed pierwszym pilotem zachowaj kopie:

- schematu Supabase:
  - `supabase/schema.sql`
  - `supabase/rls_hardening.sql`
- konfiguracji i runbooka:
  - `BACKEND_SCOPE.md`
  - `LAUNCH_CHECKLIST.md`
  - `SUPABASE_INTEGRATION.md`
- danych testowych albo eksportu z tabel:
  - wyeksportuj z dashboardu Supabase lub z uzyciem CLI, jesli jest dostepny

Jeżeli pracujesz lokalnie i chcesz wrócic do zestawu demo:

- uruchom demo lokalne,
- korzystaj z lokalnych kont z `README.md`,
- w razie potrzeby wyczysc kart demo skryptem `supabase/delete_demo_cards.sql`.

## Seed

Startowe dane dla lokalnego demo pochodza z:

- `app/src/data/seed.ts`
- `app/src/data/localProvider.ts`

Na stagingu nie seeduj przypadkowych kart produkcyjnych. Lepiej:

- stworzyc 1-2 konta testowe dla kazdej roli,
- wgrac 5-10 kart testowych na lidera i 2-3 karty specjalisty,
- sprawdzic widok `viewer`, `leader` i `admin`.

## Restore

Jeżeli pilot trzeba odtworzyc:

1. Odtworz schemat z `supabase/schema.sql`.
2. Nałoz `supabase/rls_hardening.sql`.
3. Przywroc konta testowe.
4. Przywroc karty testowe z eksportu albo ponownie je utworz.
5. Sprawdz czy audyt i eksporty dalej dzialaja.

## Scenariusze pilota

### 1. Logowanie

- zaloguj `admin`,
- zaloguj `leader`,
- zaloguj `assessor`,
- zaloguj `viewer` / `Specjalista`,
- odswiez przegladarke i sprawdz czy sesja zostaje.
- w trybie Supabase potwierdz, ze szkice, komentarze i powiadomienia nie pochodza z lokalnego demo.

### 2. Ocena

- otworz formularz,
- wybierz specjaliste,
- wpisz kontakt,
- zapisz szkic,
- odswiez strone i sprawdz czy szkic wraca,
- sprobuj zapisac niekompletna karte i sprawdz czy formularz blokuje zapis z lista brakow,
- zapisz pelna karte.

### 3. Ewidencja

- otworz kolejke decyzji,
- ustaw filtry podstawowe,
- rozwin `Wiecej filtrow`,
- wykonaj eksport CSV i JSON,
- sprawdz czy podglad i statusy sa czytelne.

### 4. Analityka

- sprawdz 4 KPI na gorze,
- otworz sekcje `Priorytety`,
- sprawdz `Trendy` i `Najnizsze karty`,
- zweryfikuj, czy panel pomaga podjac decyzje.

### 5. Raporty

- ustaw filtr okresu i typu,
- sprawdz podglad raportu,
- wykonaj eksport CSV/XLSX/JSON,
- przelacz do ewidencji z poziomu akcji.

### 6. Administracja

- sprawdz `Ostatnie zmiany`,
- zapisz konfiguracje,
- zmien konto uzytkownika,
- utworz nowe konto,
- potwierdz wpis w audycie.

## Go / No-Go

### Go

Wchodzimy do uzywania, jezeli:

- login dziala bez obejsc,
- rola `viewer` nie widzi cudzych kart,
- zapisy nie gubia szkicow po odswiezeniu,
- audyt zapisuje zmiany admina,
- eksporty dzialaja,
- piloci rozumieja co maja zrobic bez tlumaczenia.

### No-Go

Wstrzymujemy publikacje, jezeli:

- ktoras rola widzi zbyt szeroki zakres danych,
- szkic nie wraca po refreshu,
- zapis karty nadpisuje lub gubi pola,
- audyt nie zapisuje zmian,
- eksport ma uszkodzone naglowki albo puste kolumny,
- pilot musi byc prowadzony krok po kroku przez osobe z zespolu.

# CODEX Tests and Reliability Report

Automation: Codex heartbeat `tests-and-reliability-loop`

Schedule: every 17 minutes in Codex

Scope: root quality gates only. The automation runs `npm run lint`, `npm run build`, `npm run test`, and `npm run smoke` when it makes a repo change.

Initial setup status:

- Status: `DONE`
- Notes: scheduled Codex automation added; the next wake-up will populate real command results in this report.

## Run 2026-06-01 00:03:02 +02:00

Data i godzina:
2026-06-01 00:03:02 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/utils/storage.ts` i `app/src/utils/storage.test.ts`
2. `app/src/lib/fileExport.ts` i `app/src/lib/fileExport.test.ts`
3. `app/src/domain/errors.ts` i `app/src/domain/errors.test.ts`

Znalezione problemy:
1. `canUsePersistentStorage()` zwraca `true`, gdy `localStorage` istnieje, ale rzuca wyjatki przy odczycie lub zapisie.
2. `buildCsv()` ma tylko podstawowe pokrycie dla dwoch kolumn i brak testu dla pustego zestawu wierszy.
3. `getErrorKind()` ma ograniczone pokrycie dla obiektow z polem `error` zamiast `message`.

Wybrane zadanie:
Naprawa falszywie pozytywnego sygnalu dostepnosci persistent storage.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
Zmiana jest lokalna, zgodna z juz istniejacym fallbackiem do pamieci i poprawia diagnostyke bez zmiany przeplywow danych.

Co zmieniono:
`canUsePersistentStorage()` wykonuje teraz bezpieczny probe `setItem`/`removeItem` zamiast samego sprawdzenia obecnosci API. Test storage zostal rozszerzony o przypadek z blokowanym `localStorage`.

Zmienione pliki:
- `app/src/utils/storage.ts`
- `app/src/utils/storage.test.ts`

Dodane lub zmienione testy:
- Rozszerzony test `falls back to in-memory storage when localStorage throws` o asercje `canUsePersistentStorage() === false`.

Uruchomione komendy:
- `npm exec vitest run app/src/utils/storage.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 3 testy, full: 22 pliki passed, 1 skipped; 59 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Dashboard diagnostics storage status w przegladarce z blokowanym `localStorage`, jesli taki scenariusz bedzie walidowany recznie.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test dla `buildCsv()` z pustym inputem albo dla `getErrorKind()` z payloadem `{ error: ... }`.

## Run 2026-06-01 00:47:15 +02:00

Data i godzina:
2026-06-01 00:47:15 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/lib/fileExport.ts` i `app/src/lib/fileExport.test.ts`
2. `app/src/domain/errors.ts` i `app/src/domain/errors.test.ts`
3. `tests/supabase.integration.test.ts` i root test scripts z `package.json`

Znalezione problemy:
1. `buildCsv()` nie mial jawnego testu kontraktu dla pustego eksportu i moglby stracic BOM przy przyszlym refactorze.
2. `downloadFile()` nie ma testu pilnujacego zwolnienia `objectURL`, co zostawia lekki obszar bez pokrycia wokol cleanupu DOM/API.
3. `getErrorKind()` nadal ma niski koszt dopisania pokrycia dla payloadu `{ error: ... }`, ale pliki sa aktualnie modyfikowane poza ta petla.

Wybrane zadanie:
Dodanie regresyjnego testu dla pustego eksportu CSV.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
Zmiana ogranicza sie do jednego testu w niezmienianym obszarze i domyka prosty kontrakt eksportu bez naruszania logiki aplikacji.

Co zmieniono:
Dodano test potwierdzajacy, ze `buildCsv([])` zwraca wyłącznie BOM UTF-8, co stabilizuje zachowanie pustych eksportow.

Zmienione pliki:
- `app/src/lib/fileExport.test.ts`

Dodane lub zmienione testy:
- Nowy test `returns only the UTF-8 BOM for an empty export`.

Uruchomione komendy:
- `npm exec vitest run app/src/lib/fileExport.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 2 testy, full: 23 pliki passed, 1 skipped; 65 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany; opcjonalnie zweryfikowac pusty eksport z UI podczas szerszego smoke testu eksportow.

Nastepny rekomendowany krok:
Jesli obszar `errors` przestanie byc w ruchu, dodac niskiemu ryzyku test dla `getErrorKind()` z payloadem `{ error: ... }` albo dopisac izolowany test cleanupu dla `downloadFile()`.

## Run 2026-06-01 01:57:19 +02:00

Data i godzina:
2026-06-01 01:57:19 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/lib/locationHash.ts` i `app/src/lib/locationHash.test.ts`
2. `app/src/services/settingsService.ts` i `app/src/services/settingsService.test.ts`
3. root scripts z `package.json` i aktualny stan worktree

Znalezione problemy:
1. `readLocationState()` nie mial osobnego testu dla bezpiecznego fallbacku SSR bez `window`.
2. `buildLocationHash({ view: 'registry' })` nadal nie ma jawnej asercji kontraktu dla domyslnego `preset=all`.
3. `getAppEnvironment()` nie ma testu regresyjnego dla nieprawidlowej wartosci `VITE_APP_ENV` i fallbacku do trybu dev/prod.

Wybrane zadanie:
Dodanie testu SSR dla `readLocationState()`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza izolowana poprawa testowa w niezmodyfikowanym obszarze; wzmacnia helper routingu bez zmiany zachowania produkcyjnego.

Co zmieniono:
Dodano test usuwajacy `window` z globalnego scope i potwierdzajacy, ze `readLocationState()` zwraca bezpieczny fallback `{ view: 'start' }`. Test przywraca tez pierwotny stan `window` po wykonaniu.

Zmienione pliki:
- `app/src/lib/locationHash.test.ts`

Dodane lub zmienione testy:
- Nowy test `returns the start view when read without window state`.

Uruchomione komendy:
- `npm exec vitest run app/src/lib/locationHash.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 6 testow, full: 24 pliki passed, 1 skipped; 69 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac test kontraktu dla `buildLocationHash({ view: 'registry' }) => 'registry?preset=all'` albo test fallbacku `getAppEnvironment()` dla nieprawidlowego `VITE_APP_ENV`.

## Run 2026-06-01 03:42:34 +02:00

Data i godzina:
2026-06-01 03:42:34 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/services/settingsService.ts` i `app/src/services/settingsService.test.ts`
2. `app/src/lib/locationHash.ts` i `app/src/lib/locationHash.test.ts`
3. `app/src/domain/errors.ts` i `app/src/domain/errors.test.ts`

Znalezione problemy:
1. `getOAuthRedirectUrl()` nie mial jawnego testu regresyjnego dla SSR/fallbacku bez `window`.
2. `buildLocationHash({ view: 'registry' })` nadal nie ma osobnej asercji dla domyslnego kontraktu `preset=all`.
3. `getErrorKind()` nadal nie ma izolowanego testu dla payloadu z komunikatem w polu `{ error: ... }`.

Wybrane zadanie:
Dodanie testu fallbacku OAuth redirect bez `window`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza izolowana poprawa w niezmodyfikowanym obszarze. Wzmacnia SSR-safe helper bez zmiany logiki produkcyjnej.

Co zmieniono:
Dodano test usuwajacy `window` z global scope i potwierdzajacy, ze `getOAuthRedirectUrl()` zwraca pusty string zamiast rzucac wyjatek.

Zmienione pliki:
- `app/src/services/settingsService.test.ts`

Dodane lub zmienione testy:
- Nowy test `returns an empty OAuth redirect URL without window state`.

Uruchomione komendy:
- `npm exec vitest run app/src/services/settingsService.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 5 testow, full: 24 pliki passed, 1 skipped; 70 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac test domyslnego `registry?preset=all` w `buildLocationHash()` albo izolowany test `getErrorKind()` dla payloadu `{ error: ... }`.

## Run 2026-06-01 04:17:23 +02:00

Data i godzina:
2026-06-01 04:17:23 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `tests/locationHash.test.ts` i `app/src/lib/locationHash.ts`
2. `app/src/services/notificationsService.ts` i `app/src/services/notificationsService.test.ts`
3. `app/src/services/settingsService.ts` oraz aktualny dirty worktree

Znalezione problemy:
1. Rootowy test hash routing nie pilnowal jawnie kontraktu `buildLocationHash({ view: 'registry' }) => 'registry?preset=all'`.
2. `notificationsService` nie ma izolowanego testu dla zachowania `markNotificationRead()` przy nieznanym `id`.
3. `getAppEnvironment()` nadal nie ma testu fallbacku dla nieprawidlowego `VITE_APP_ENV`, ale powiazany plik testowy jest juz modyfikowany w worktree.

Wybrane zadanie:
Dodanie regresyjnego testu dla domyslnego presetu registry hash.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w niezmodyfikowanym pliku testowym. Domyka stabilny kontrakt deeplinka bez ingerencji w logike produkcyjna.

Co zmieniono:
Dodano test potwierdzajacy, ze builder hasha zawsze ustawia `preset=all` dla widoku `registry`, nawet gdy stan registry nie zostal przekazany.

Zmienione pliki:
- `tests/locationHash.test.ts`

Dodane lub zmienione testy:
- Nowy test `builds the default registry preset when state is omitted`.

Uruchomione komendy:
- `npm exec vitest run tests/locationHash.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 4 testy, full: 24 pliki passed, 1 skipped; 71 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test dla `markNotificationRead()` z nieznanym `id` albo test fallbacku `getAppEnvironment()` po ustabilizowaniu pliku `settingsService.test.ts`.

## Run 2026-06-01 04:56:25 +02:00

Data i godzina:
2026-06-01 04:56:25 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/services/notificationsService.ts` i `app/src/services/notificationsService.test.ts`
2. `app/src/components/data-table/exportTable.ts` i `app/src/components/data-table/exportTable.test.ts`
3. `app/src/config/navigation.ts` i `app/src/config/navigation.test.ts`

Znalezione problemy:
1. `markNotificationRead()` nie mial izolowanego testu no-op dla nieznanego `id`, mimo ze helper jest uzywany jako bezpieczna aktualizacja listy.
2. `exportTableToXlsx()` nie ma osobnego testu pilnujacego obciecia `sheetName` do limitu 31 znakow.
3. `getVisibleNavigationItems()` nie ma regresyjnej asercji dla tlumaczen etykiet uprzywilejowanych widokow poza przypadkiem `viewer`.

Wybrane zadanie:
Dodanie testu no-op dla `markNotificationRead()` z nieznanym `id`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza izolowana zmiana w niezmodyfikowanym pliku testowym. Wzmacnia kontrakt helpera bez ingerencji w logike produkcyjna i bez wchodzenia w obszary juz zmieniane w worktree.

Co zmieniono:
Dodano test potwierdzajacy, ze oznaczenie nieistniejacego powiadomienia nie zmienia listy, zachowuje referencje istniejacego elementu i nie narusza licznika nieprzeczytanych.

Zmienione pliki:
- `app/src/services/notificationsService.test.ts`

Dodane lub zmienione testy:
- Nowy test `leaves notifications unchanged when marking an unknown id`.

Uruchomione komendy:
- `npm exec vitest run app/src/services/notificationsService.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 2 testy, full: 25 plikow passed, 1 skipped; 74 testy passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test obciecia `sheetName` w `exportTableToXlsx()` albo dodatkowa asercje tlumaczen dla niewidokowych ról w `navigation.test.ts`.

## Run Template

Data i godzina:
Tryb:
Tests and reliability loop

Skanowane obszary:
1.
2.
3.

Znalezione problemy:
1.
2.
3.

Wybrane zadanie:
Status:
Poziom ryzyka:
Dlaczego wybrane:
Co zmieniono:
Zmienione pliki:
Dodane lub zmienione testy:
Uruchomione komendy:
Wynik lint:
Wynik build:
Wynik testow:
Commit:
Co sprawdzic recznie:
Nastepny rekomendowany krok:

## Run 2026-06-01 05:27:18 +02:00

Data i godzina:
2026-06-01 05:27:18 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/components/data-table/exportTable.ts` i `app/src/components/data-table/exportTable.test.ts`
2. `app/src/config/navigation.ts` i `app/src/config/navigation.test.ts`
3. `app/src/config/dashboard.ts` i `app/src/config/dashboard.test.ts`

Znalezione problemy:
1. `exportTableToXlsx()` obcina `sheetName` do 31 znakow, ale brakowalo regresyjnego testu pilnujacego tego kontraktu Excela.
2. `getVisibleNavigationItems()` nadal nie ma dodatkowej asercji dla pelnych etykiet nawigacji roli uprzywilejowanej poza samym zestawem kluczy.
3. `normalizeDashboardPrefs()` nie ma osobnego testu dla odfiltrowania nieprawidlowych paneli i dopelnienia brakujacej kolejnosci.

Wybrane zadanie:
Dodanie testu regresyjnego dla limitu nazwy arkusza XLSX.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w niezmodyfikowanym pliku testowym. Domyka stabilny kontrakt helpera eksportu bez ingerencji w runtime ani obszary juz modyfikowane w worktree.

Co zmieniono:
Dodano test potwierdzajacy, ze eksport XLSX przekazuje do `book_append_sheet()` nazwe arkusza obcieta do 31 znakow zgodnie z limitem Excela.

Zmienione pliki:
- `app/src/components/data-table/exportTable.test.ts`

Dodane lub zmienione testy:
- Nowy test `truncates sheet names to the Excel 31-character limit`.

Uruchomione komendy:
- `npm exec vitest run app/src/components/data-table/exportTable.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 2 testy, full: 26 plikow passed, 1 skipped; 77 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test dla `normalizeDashboardPrefs()` z nieprawidlowymi panelami albo rozszerzyc `navigation.test.ts` o etykiety dla roli uprzywilejowanej.

## Run 2026-06-01 01:22:50 +02:00

Data i godzina:
2026-06-01 01:22:50 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/domain/diagnostics.ts` i `app/src/domain/diagnostics.test.ts`
2. `app/src/lib/locationHash.ts` i `app/src/lib/locationHash.test.ts`
3. `app/src/services/settingsService.ts` i `app/src/services/settingsService.test.ts`

Znalezione problemy:
1. `recordDiagnostic()` ma limit 120 wpisow, ale brakowalo testu regresyjnego pilnujacego odciecia najstarszych zdarzen.
2. `readLocationState()` nie ma osobnego testu dla bezpiecznego fallbacku SSR bez `window`.
3. `buildLocationHash()` nie ma jawnej asercji, ze `registry` bez stanu buduje stabilny domyslny preset `all`.

Wybrane zadanie:
Dodanie testu regresyjnego dla limitu historii diagnostycznej.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
Zmiana ogranicza sie do jednego niezmodyfikowanego pliku testowego i zabezpiecza prosty kontrakt retencji bez ingerencji w logike produkcyjna.

Co zmieniono:
Dodano test, ktory zapisuje 125 zdarzen diagnostycznych i potwierdza, ze pozostaje tylko 120 najnowszych wpisow w poprawnej kolejnosci.

Zmienione pliki:
- `app/src/domain/diagnostics.test.ts`

Dodane lub zmienione testy:
- Nowy test `keeps only the newest 120 events`.

Uruchomione komendy:
- `npm exec vitest run app/src/domain/diagnostics.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 3 testy, full: 24 pliki passed, 1 skipped; 68 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test SSR dla `readLocationState()` albo test domyslnego `registry?preset=all` w builderze hashy.

## Run 2026-06-01 06:02:15 +02:00

Data i godzina:
2026-06-01 06:02:15 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/config/dashboard.ts` i `app/src/config/dashboard.test.ts`
2. `app/src/config/navigation.ts` i `app/src/config/navigation.test.ts`
3. `app/src/services/settingsService.ts` i `app/src/services/settingsService.test.ts`

Znalezione problemy:
1. `normalizeDashboardPrefs()` nie mial testu regresyjnego dla odfiltrowania nieznanych paneli i dopelnienia brakujacej kolejnosci domyslnej.
2. `getVisibleNavigationItems()` nadal nie ma osobnej asercji dla pelnych przetlumaczonych etykiet nawigacji roli uprzywilejowanej.
3. `getAppEnvironment()` nadal nie ma testu fallbacku dla nieprawidlowego `VITE_APP_ENV`, ale powiazany plik testowy jest juz modyfikowany w worktree.

Wybrane zadanie:
Dodanie testu regresyjnego dla normalizacji preferencji dashboardu.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w niezmodyfikowanym obszarze konfiguracji. Domyka kontrakt helpera bez ingerencji w runtime i bez kolizji z juz edytowanymi plikami testowymi.

Co zmieniono:
Dodano test potwierdzajacy, ze `normalizeDashboardPrefs()` usuwa nieznane panele z `order` i `hidden`, zachowuje poprawne ustawienia `density` oraz `layout`, a brakujace panele dopina w stabilnej domyslnej kolejnosci.

Zmienione pliki:
- `app/src/config/dashboard.test.ts`

Dodane lub zmienione testy:
- Nowy test `filters unknown panels and appends missing defaults in order`.

Uruchomione komendy:
- `npm exec vitest run app/src/config/dashboard.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 2 testy, full: 27 plikow passed, 1 skipped; 79 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku asercje etykiet dla uprzywilejowanej nawigacji albo test fallbacku `getAppEnvironment()` po ustabilizowaniu `settingsService.test.ts`.

## Run 2026-06-01 06:37:27 +02:00

Data i godzina:
2026-06-01 06:37:27 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/config/navigation.ts` i `app/src/config/navigation.test.ts`
2. `app/src/lib/theme.ts` i `app/src/lib/theme.test.tsx`
3. `app/src/lib/display.ts` i `app/src/lib/display.test.ts`

Znalezione problemy:
1. `getVisibleNavigationItems()` nie mial osobnej asercji dla pelnego zestawu przetlumaczonych etykiet roli uprzywilejowanej, wiec przyszly refactor moglby zmienic label key albo kolejnosc bez wykrycia.
2. `useTheme()` nadal nie ma izolowanego testu dla powrotu z trybu `dark` do `light` i ponownego zapisu preferencji po drugim przełączeniu.
3. `display.test.ts` sprawdza tylko wybrane etykiety roli i providera, bez pelniejszego pokrycia map etykiet dla pozostalych ról uprzywilejowanych.

Wybrane zadanie:
Dodanie regresyjnego testu etykiet i kolejnosci nawigacji dla administratora.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w niezmodyfikowanym pliku testowym. Wzmacnia kontrakt UI dla uprawnionej nawigacji bez ruszania runtime ani obszarow bedacych juz w ruchu.

Co zmieniono:
Dodano test potwierdzajacy, ze administrator widzi stabilna kolejnosc wszystkich widokow oraz odpowiadajace im przetlumaczone `labelKey`.

Zmienione pliki:
- `app/src/config/navigation.test.ts`

Dodane lub zmienione testy:
- Nowy test `keeps translated privileged navigation labels in stable order for admins`.

Uruchomione komendy:
- `npm exec vitest run app/src/config/navigation.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 3 testy, full: 28 plikow passed, 1 skipped; 83 testy passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test drugiego przełączenia motywu z powrotem na `light` albo pelniejsze pokrycie map etykiet w `display.test.ts`.
## Run 2026-06-01 07:12:26 +02:00

Data i godzina:
2026-06-01 07:12:26 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/lib/theme.ts` i `app/src/lib/theme.test.tsx`
2. `app/src/lib/display.ts` i `app/src/lib/display.test.ts`
3. `app/src/services/settingsService.ts` i `app/src/services/settingsService.test.ts`

Znalezione problemy:
1. `useTheme()` nie pilnowal osobnym testem powrotu z `dark` do `light` po drugim przelaczeniu i ponownego zapisu preferencji.
2. `display.test.ts` nadal sprawdza tylko wybrane etykiety rol i providerow, bez pelniejszego pokrycia calych map labeli.
3. `getAppEnvironment()` nadal nie ma izolowanego testu fallbacku dla nieprawidlowego `VITE_APP_ENV`, ale plik `settingsService.test.ts` pozostaje mniej atrakcyjny do ruszania w tej petli niz czysto lokalny test motywu.

Wybrane zadanie:
Dodanie regresyjnego testu drugiego przelaczenia motywu.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana testowa w niezmodyfikowanym obszarze UI helpera. Domyka prosty kontrakt persystencji bez ingerencji w runtime aplikacji.

Co zmieniono:
Rozszerzono istniejacy test `useTheme()` o drugi klik, ktory potwierdza powrot do `light`, poprawne klasy na root elemencie oraz zapis `oceniator-theme=light` po ponownym przelaczeniu.

Zmienione pliki:
- `app/src/lib/theme.test.tsx`

Dodane lub zmienione testy:
- Rozszerzony test `toggles the theme class and persists the next preference`.

Uruchomione komendy:
- `npm exec vitest run app/src/lib/theme.test.tsx`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 2 testy, full: 28 plikow passed, 1 skipped; 84 testy passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku pelniejsze pokrycie map etykiet w `display.test.ts` albo rozwazyc test fallbacku `getAppEnvironment()` po ustabilizowaniu obszaru `settingsService`.

## Run 2026-06-01 07:47:17 +02:00

Data i godzina:
2026-06-01 07:47:17 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/domain/errors.ts` i `app/src/domain/errors.test.ts`
2. `app/src/lib/display.ts` i `app/src/lib/display.test.ts`
3. `app/src/services/settingsService.ts` i `app/src/services/settingsService.test.ts`

Znalezione problemy:
1. `getErrorMessage()` i `getErrorKind()` nie mialy jawnej regresyjnej asercji dla payloadow obiektowych z komunikatem w polu `{ error: ... }`.
2. `display.test.ts` nadal sprawdza tylko wybrane etykiety rol i providerow, bez pelniejszego pokrycia calej mapy labeli.
3. `getAppEnvironment()` nadal nie ma izolowanego testu fallbacku dla nieprawidlowego `VITE_APP_ENV`.

Wybrane zadanie:
Dodanie regresyjnych asercji dla obiektowego payloadu bledu `{ error: ... }`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w niezmodyfikowanym pliku testowym. Domyka kontrakt helperow bledow bez ingerencji w runtime i bez wchodzenia w obszary juz modyfikowane w worktree.

Co zmieniono:
Rozszerzono testy helperow bledow o przypadek obiektowego payloadu z polem `error`, tak aby pilnowac zarowno ekstrakcji komunikatu, jak i klasyfikacji `forbidden`.

Zmienione pliki:
- `app/src/domain/errors.test.ts`

Dodane lub zmienione testy:
- Rozszerzony test `prefers concrete error messages` o przypadek `{ error: 'Quota exceeded' }`.
- Rozszerzony test `classifies common error types` o przypadek `{ error: 'Brak dostepu do raportu' }`.

Uruchomione komendy:
- `npm exec vitest run app/src/domain/errors.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 4 testy, full: 28 plikow passed, 1 skipped; 85 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku pelniejsze pokrycie map etykiet w `display.test.ts` albo test fallbacku `getAppEnvironment()` dla nieprawidlowego `VITE_APP_ENV`.

## Run 2026-06-01 08:58:17 +02:00

Data i godzina:
2026-06-01 08:58:17 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/lib/display.ts` i `app/src/lib/display.test.ts`
2. `app/src/domain/diagnostics.ts` i `app/src/domain/diagnostics.test.ts`
3. `app/src/services/settingsService.ts` i `app/src/services/settingsService.test.ts`

Znalezione problemy:
1. `display.test.ts` sprawdzal tylko wybrane etykiety roli i providera, bez pilnowania calej mapy labeli oraz kolejnosci `ROLE_OPTIONS`.
2. `scopeLabel()` nadal nie ma pelnej asercji mapowania dla pozostalych scope'ow diagnostycznych, wiec przyszly refactor moglby zmienic pojedynczy label bez wykrycia.
3. `getAppEnvironment()` nadal nie ma izolowanego testu fallbacku dla nieprawidlowego `VITE_APP_ENV`, ale powiazany plik testowy jest juz modyfikowany w worktree.

Wybrane zadanie:
Rozszerzenie regresyjnego testu map etykiet display helperow.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w niezmodyfikowanym pliku testowym. Wzmacnia stabilny kontrakt UI bez ruszania runtime ani obszarow juz edytowanych w worktree.

Co zmieniono:
Rozszerzono test `display helpers` tak, aby pilnowal calej mapy `ROLE_LABELS`, stabilnej kolejnosci `ROLE_OPTIONS` oraz kompletnej mapy `PROVIDER_LABELS`. Przy okazji test zostal skorygowany do kanonicznej etykiety `Oceniający`.

Zmienione pliki:
- `app/src/lib/display.test.ts`

Dodane lub zmienione testy:
- Rozszerzony test `exposes user-facing role and provider labels without mojibake`.

Uruchomione komendy:
- `npm exec vitest run app/src/lib/display.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 2 testy, full: 28 plikow passed, 1 skipped; 86 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku pelniejsze pokrycie `scopeLabel()` dla brakujacych scope'ow diagnostycznych albo test fallbacku `getAppEnvironment()` po ustabilizowaniu `settingsService.test.ts`.

## Run 2026-06-01 09:33:07 +02:00

Data i godzina:
2026-06-01 09:33:07 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/domain/diagnostics.ts` i `app/src/domain/diagnostics.test.ts`
2. `app/src/services/settingsService.ts` i `app/src/services/settingsService.test.ts`
3. `app/src/domain/history.ts` i `app/src/domain/history.test.ts`

Znalezione problemy:
1. `scopeLabel()` nie pilnowal pelnego mapowania wszystkich obslugiwanych scope'ow diagnostycznych, wiec przyszly refactor moglby zmienic pojedyncza etykiete bez wykrycia.
2. `getAppEnvironment()` nadal nie ma izolowanego testu fallbacku dla nieprawidlowego `VITE_APP_ENV`.
3. Helpery historii nie maja osobnej asercji dla pustego `statusHistory` i bezpiecznych pustych wartosci pochodnych.

Wybrane zadanie:
Rozszerzenie regresyjnego testu mapowania `scopeLabel()`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w niezmodyfikowanym pliku testowym. Wzmacnia stabilny kontrakt etykiet diagnostycznych bez ruszania runtime ani obszarow juz zmodyfikowanych w worktree.

Co zmieniono:
Rozszerzono test `maps scopes to human-readable labels`, aby pilnowal wszystkich wspieranych scope'ow diagnostycznych oraz fallbacku passthrough dla typu oceny `r`.

Zmienione pliki:
- `app/src/domain/diagnostics.test.ts`

Dodane lub zmienione testy:
- Rozszerzony test `maps scopes to human-readable labels`.

Uruchomione komendy:
- `npm exec vitest run app/src/domain/diagnostics.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 3 testy, full: 29 plikow passed, 1 skipped; 89 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test fallbacku `getAppEnvironment()` dla nieprawidlowego `VITE_APP_ENV` albo bezpieczne asercje pustego `statusHistory` w helperach historii.

## Run 2026-06-01 10:07:50 +02:00

Data i godzina:
2026-06-01 10:07:50 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/services/settingsService.ts` i `app/src/services/settingsService.test.ts`
2. `app/src/domain/history.ts` i `app/src/domain/history.test.ts`
3. aktualny dirty worktree oraz root scripts z `package.json`

Znalezione problemy:
1. `getAppEnvironment()` nie mial izolowanego testu fallbacku dla nieprawidlowego `VITE_APP_ENV`, wiec przyszly refactor moglby latwo zgubic runtime fallback do `DEV`/produkcji.
2. Helpery historii nadal nie maja osobnej asercji dla pustego `statusHistory` i bezpiecznych pustych wartosci pochodnych.
3. Worktree jest brudny w kilku innych plikach testowych i UI, wiec petla powinna omijac obszary juz bedace w ruchu.

Wybrane zadanie:
Dodanie regresyjnego testu fallbacku `getAppEnvironment()` dla nieprawidlowego `VITE_APP_ENV`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w czystym pliku testowym. Wzmacnia kontrakt konfiguracji bez zmiany runtime aplikacji i bez kolizji z obszarami juz modyfikowanymi w worktree.

Co zmieniono:
Rozszerzono `settingsService.test.ts` o test, ktory stubuje nieprawidlowa wartosc `VITE_APP_ENV` i pilnuje fallbacku do aktualnej galezi runtime (`local` przy `import.meta.env.DEV`, w przeciwnym razie `production`). Pierwsza wersja testu zakladala stale `production`; po porazce w Vitest zostala skorygowana do rzeczywistego kontraktu helpera.

Zmienione pliki:
- `app/src/services/settingsService.test.ts`

Dodane lub zmienione testy:
- Nowy test `falls back to the current runtime when VITE_APP_ENV is invalid`.

Uruchomione komendy:
- `npm exec vitest run app/src/services/settingsService.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 6 testow, full: 29 plikow passed, 1 skipped; 90 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku bezpieczne asercje pustego `statusHistory` w `app/src/domain/history.test.ts` albo szukac kolejnego czystego helpera testowego poza plikami juz zmienianymi w worktree.

## Run 2026-06-01 10:42:28 +02:00

Data i godzina:
2026-06-01 10:42:28 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/domain/history.ts` i `app/src/domain/history.test.ts`
2. `app/src/utils/storage.ts` i `app/src/utils/storage.test.ts`
3. aktualny dirty worktree oraz root scripts z `package.json`

Znalezione problemy:
1. Helpery historii nie mialy osobnej asercji dla braku `statusHistory`, mimo ze runtime zwraca bezpieczne puste wartosci pochodne.
2. `storage.test.ts` nadal nie pilnuje fallbacku `readStorageJson()` dla pustego stringa z local storage, co jest niskim ryzykiem na kolejny przebieg.
3. Worktree pozostaje brudny w wielu innych testach i plikach UI, wiec petla powinna dalej omijac obszary juz bedace w ruchu.

Wybrane zadanie:
Dodanie regresyjnego testu bezpiecznego fallbacku helperow historii przy braku `statusHistory`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w czystym pliku testowym. Wzmacnia kontrakt helperow domenowych bez zmiany runtime aplikacji i bez wchodzenia w obszary objete aktywnymi modyfikacjami.

Co zmieniono:
Rozszerzono `history.test.ts` o test, ktory ustawia `statusHistory: undefined` i pilnuje, ze `lastStatusEvent()` zwraca `undefined`, pola pochodne zwracaja puste stringi, a `hasEditHistory()` pozostaje `false`.

Zmienione pliki:
- `app/src/domain/history.test.ts`

Dodane lub zmienione testy:
- Nowy test `returns safe empty values when history is missing`.

Uruchomione komendy:
- `npm exec vitest run app/src/domain/history.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 4 testy, full: 30 plikow passed, 1 skipped; 93 testy passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku asercje fallbacku `readStorageJson()` dla pustego stringa w `app/src/utils/storage.test.ts` albo dalej szukac kolejnego czystego helpera testowego poza plikami juz zmienianymi w worktree.

## Run 2026-06-01 11:17:38 +02:00

Data i godzina:
2026-06-01 11:17:38 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/utils/storage.ts` i `app/src/utils/storage.test.ts`
2. `app/src/lib/format.ts` i `app/src/lib/format.test.ts`
3. `app/src/domain/audit.ts` i `app/src/domain/audit.test.ts`

Znalezione problemy:
1. `readStorageJson()` nie mial osobnej asercji fallbacku dla pustego stringa z storage, mimo ze helper traktuje pusty payload jak brak danych.
2. `formatDate()` nie ma izolowanego testu dla nieprawidlowych bialych znakow lub tekstu z samymi spacjami, wiec taki kontrakt pozostaje niejawny.
3. `identity()` w helperach audytu nie ma osobnego testu priorytetu fallbacku `email/login`, gdy `fullName` jest pusty.

Wybrane zadanie:
Dodanie regresyjnego testu fallbacku `readStorageJson()` dla pustego payloadu storage.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w czystym pliku testowym. Domyka lokalny kontrakt helpera storage bez ingerencji w runtime aplikacji i omija pliki juz zmieniane w innych obszarach worktree.

Co zmieniono:
Dodano test potwierdzajacy, ze `readStorageJson()` zwraca przekazany fallback, gdy `localStorage.getItem()` zwroci pusty string zamiast poprawnego JSON-a.

Zmienione pliki:
- `app/src/utils/storage.test.ts`

Dodane lub zmienione testy:
- Nowy test `returns fallback json on empty storage payloads`.

Uruchomione komendy:
- `npm exec vitest run app/src/utils/storage.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 4 testy, full: 31 plikow passed, 1 skipped; 99 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test fallbacku `identity()` w `app/src/domain/audit.test.ts` albo dalej szukac kolejnego czystego helpera poza plikami juz modyfikowanymi w worktree.

## Run 2026-06-01 11:52:19 +02:00

Data i godzina:
2026-06-01 11:52:19 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/domain/audit.ts` i `app/src/domain/audit.test.ts`
2. `app/src/lib/format.ts` i `app/src/lib/format.test.ts`
3. aktualny dirty worktree oraz root scripts z `package.json`

Znalezione problemy:
1. Helper `identity()` nie mial osobnej asercji dla fallbacku `email`, gdy `fullName` jest pusty, mimo ze logi audytowe polegaja na tej degradacji.
2. `formatDate()` nadal nie ma izolowanego testu dla wartosci z samych bialych znakow, wiec kontrakt dla takiego payloadu pozostaje niejawny.
3. Worktree pozostaje brudny w wielu innych plikach UI i testach, wiec petla powinna dalej wybierac tylko czyste, lokalne obszary.

Wybrane zadanie:
Dodanie regresyjnego testu fallbacku `identity()` do `email`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w czystym pliku testowym. Wzmacnia kontrakt audytu bez zmiany runtime aplikacji i bez kolizji z obszarami juz edytowanymi w worktree.

Co zmieniono:
Dodano test potwierdzajacy, ze helpery audytu buduja opisy tworzenia i aktualizacji konta z adresem e-mail, gdy `fullName` jest pusty.

Zmienione pliki:
- `app/src/domain/audit.test.ts`

Dodane lub zmienione testy:
- Nowy test `falls back to email when full name is empty`.

Uruchomione komendy:
- `npm exec vitest run app/src/domain/audit.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 3 testy, full: 31 plikow passed, 1 skipped; 101 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test dla `formatDate()` z bialymi znakami albo dalej szukac kolejnego czystego helpera testowego poza plikami juz modyfikowanymi w worktree.

## Run 2026-06-01 12:27:40 +02:00

Data i godzina:
2026-06-01 12:27:40 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/domain/workflows.ts` i `app/src/domain/workflows.test.ts`
2. `app/src/domain/access.ts` i `app/src/domain/access.test.ts`
3. `app/src/config/status.ts` i `app/src/config/status.test.ts`

Znalezione problemy:
1. `prependManagedUser()` nie mial osobnej asercji pilnujacej deduplikacji po `id`, mimo ze helper filtruje istniejacy rekord przed prependem.
2. `replaceAssessmentById()` i `replaceManagedUserById()` nadal nie maja jawnego testu no-op dla brakujacego `id`.
3. `mergeImportedAssessments()` nadal nie ma osobnej asercji stabilnosci kolejnosci dla pustego importu.

Wybrane zadanie:
Dodanie regresyjnego testu deduplikacji `prependManagedUser()`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w czystym pliku testowym. Domyka lokalny kontrakt helpera workflow bez ruszania runtime aplikacji i bez wchodzenia w obszary juz modyfikowane w worktree.

Co zmieniono:
Dodano test potwierdzajacy, ze `prependManagedUser()` wstawia zaktualizowanego uzytkownika na poczatek, usuwa duplikat o tym samym `id` i zachowuje kolejnosc pozostalych rekordow.

Zmienione pliki:
- `app/src/domain/workflows.test.ts`

Dodane lub zmienione testy:
- Nowy test `deduplicates prepended managed users by id`.

Uruchomione komendy:
- `npm exec vitest run app/src/domain/workflows.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 4 testy, full: 32 pliki passed, 1 skipped; 108 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test no-op dla `replaceAssessmentById()` lub `replaceManagedUserById()` przy brakujacym `id`, albo test stabilnosci `mergeImportedAssessments()` dla pustego importu.

## Run 2026-06-01 13:02:32 +02:00

Data i godzina:
2026-06-01 13:02:32 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/lib/format.ts` i `app/src/lib/format.test.ts`
2. `app/src/lib/fileExport.ts` i `app/src/lib/fileExport.test.ts`
3. `app/src/services/notificationsService.ts` i `app/src/services/notificationsService.test.ts`

Znalezione problemy:
1. `formatDate()` traktowal pusty string jako brak danych, ale wartosc z samych bialych znakow przechodzila dalej i mogla trafic do UI jako puste spacje.
2. `downloadFile()` nadal nie ma osobnej asercji cleanupu `URL.revokeObjectURL()` po kliknieciu linku eksportu.
3. `createNotification()` nadal nie ma osobnej asercji dla zachowania opcjonalnego `relatedEntityId` w payloadzie.

Wybrane zadanie:
Normalizacja bialych znakow w `formatDate()`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w czystym helperze i odpowiada juz istniejacemu fallbackowi `'-'` dla pustej daty, bez ingerencji w backend ani obszary aktualnie zmieniane w worktree.

Co zmieniono:
`formatDate()` przycina teraz wejscie przed walidacja, dzieki czemu wartosci z samych spacji sa traktowane jak pusta data i zwracaja `'-'`. Test formatu dat zostal rozszerzony o przypadek whitespace-only.

Zmienione pliki:
- `app/src/lib/format.ts`
- `app/src/lib/format.test.ts`

Dodane lub zmienione testy:
- Rozszerzony test `handles valid, empty, and invalid date strings safely` o przypadek `'   '`.

Uruchomione komendy:
- `npm exec vitest run app/src/lib/format.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 4 testy, full: 34 pliki passed, 1 skipped; 111 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test cleanupu `downloadFile()` albo asercje opcjonalnego `relatedEntityId` w `createNotification()`.

## Run 2026-06-01 13:37:51 +02:00

Data i godzina:
2026-06-01 13:37:51 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/lib/fileExport.ts` i `app/src/lib/fileExport.test.ts`
2. `app/src/services/notificationsService.ts` i `app/src/services/notificationsService.test.ts`
3. `app/src/domain/workflows.ts` i `app/src/domain/workflows.test.ts`

Znalezione problemy:
1. `downloadFile()` nie mial osobnej asercji cleanupu `URL.revokeObjectURL()` po kliknieciu tymczasowego linku eksportu.
2. `createNotification()` nadal nie ma osobnej asercji dla zachowania opcjonalnego `relatedEntityId` w payloadzie.
3. `replaceAssessmentById()` i `replaceManagedUserById()` nadal nie maja jawnego testu no-op dla brakujacego `id`.

Wybrane zadanie:
Dodanie regresyjnego testu cleanupu `downloadFile()`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w czystym helperze eksportu. Domyka kontrakt cleanupu zasobow przegladarki bez zmiany runtime aplikacji ani dotykania obszarow backendowych.

Co zmieniono:
Plik testowy `fileExport` zostal przestawiony na `jsdom`, dostal porzadkowanie DOM/timerow po kazdym tescie i nowa asercje pilnujaca, ze `downloadFile()` klika tymczasowy link, usuwa go z DOM oraz wywoluje `URL.revokeObjectURL()` dla wygenerowanego blob URL.

Zmienione pliki:
- `app/src/lib/fileExport.test.ts`

Dodane lub zmienione testy:
- Nowy test `revokes temporary object URLs after triggering a download`.
- Dodana adnotacja `// @vitest-environment jsdom` dla testow DOM helpera eksportu.

Uruchomione komendy:
- `npm exec vitest run app/src/lib/fileExport.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 3 testy, full: 35 plikow passed, 1 skipped; 115 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku asercje opcjonalnego `relatedEntityId` w `createNotification()` albo test no-op dla `replaceAssessmentById()` przy brakujacym `id`.

## Run 2026-06-01 14:12:59 +02:00

Data i godzina:
2026-06-01 14:12:59 +02:00

Tryb:
Tests and reliability loop

Skanowane obszary:
1. `app/src/services/notificationsService.ts` i `app/src/services/notificationsService.test.ts`
2. `app/src/domain/workflows.ts` i `app/src/domain/workflows.test.ts`
3. `app/src/domain/access.ts` i `app/src/domain/access.test.ts`

Znalezione problemy:
1. `createNotification()` nie mial osobnej asercji pilnujacej zachowania opcjonalnego `relatedEntityId`, mimo ze payload sluzy do deeplinkow i kontekstu notyfikacji.
2. `replaceAssessmentById()` i `replaceManagedUserById()` nadal nie maja jawnego testu no-op dla brakujacego `id`.
3. Helpery dostepu nadal nie maja osobnej asercji dla deduplikacji tokenow viewer fallbacku `podglad`.

Wybrane zadanie:
Dodanie regresyjnego testu payloadu `createNotification()` dla opcjonalnego `relatedEntityId`.

Status:
`DONE`

Poziom ryzyka:
`P3`

Dlaczego wybrane:
To najmniejsza bezpieczna zmiana w czystym pliku testowym. Domyka kontrakt helpera notyfikacji bez ingerencji w runtime aplikacji i omija obszary juz edytowane w worktree.

Co zmieniono:
Dodano test, ktory zamraza czas, stubuje `crypto.randomUUID()` i potwierdza, ze `createNotification()` zachowuje `relatedEntityType`, `relatedEntityId`, `userId`, status `read: false` oraz stabilny `createdAt`.

Zmienione pliki:
- `app/src/services/notificationsService.test.ts`

Dodane lub zmienione testy:
- Nowy test `keeps optional related entity metadata in created notifications`.

Uruchomione komendy:
- `npm exec vitest run app/src/services/notificationsService.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run smoke`

Wynik lint:
`PASS`

Wynik build:
`PASS`

Wynik testow:
`PASS` - targeted: 1 plik / 3 testy, full: 35 plikow passed, 1 skipped; 116 testow passed, 5 skipped

Commit:
brak

Co sprawdzic recznie:
Brak wymaganego manualnego follow-up dla tej zmiany.

Nastepny rekomendowany krok:
Dodac niskiemu ryzyku test no-op dla `replaceAssessmentById()` lub `replaceManagedUserById()` przy brakujacym `id`, albo osobna asercje dla tokenow viewer fallbacku `podglad`.

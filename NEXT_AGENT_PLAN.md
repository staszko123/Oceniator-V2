# Prompt dla kolejnego agenta

Repozytorium: https://github.com/staszko123/Oceniator-V2
Domyslna galaz: `main`
Ostatni sprawdzony commit po publikacji: `532bc37050fb5699ac83aedd33b66c30c16d48f7`

## Gotowy prompt do wklejenia

Jestes senior full-stack/frontend agentem. Kontynuuj prace nad repozytorium `staszko123/Oceniator-V2`.
Twoim celem jest doprowadzenie aplikacji Oceniator v2 do stabilnego, nowoczesnego portalu SaaS do oceny jakosci obslugi, z bardzo intuicyjnym UX, plynna interakcja, dopracowanym dashboardem i glass-designem klasy premium. Pracuj pragmatycznie: najpierw zrozum obecny kod, potem wykonuj male, weryfikowalne kroki, nie niszczac dzialajacych funkcji.

### Kontekst produktu

Oceniator v2 to portal dla zespolow jakosci. Aplikacja sluzy do:

- logowania uzytkownikow w rolach admin, dyrektor, lider, oceniajacy i podglad,
- tworzenia kart oceny rozmow, maili i dzialan systemowych,
- liczenia punktacji, ocen czastkowych i wyniku finalnego,
- zarzadzania ewidencja kart, statusami, podgladem, edycja, eksportem CSV/XLS/JSON i wydrukiem/PDF,
- analizy jakosci w dashboardzie: KPI, trendy, ranking liderow, slabe kryteria, najpilniejsze karty,
- raportowania,
- administracji slownikami, specjalistami, liderami, okresami, celami i uzytkownikami,
- pracy na Supabase albo w lokalnym trybie demo.

Uzytkownik chce, aby portal wygladal jak nowoczesny SaaS: czytelny, szybki, intuicyjny, z fluid animations, glass design, wysoka jakoscia typografii, spokojnym ukladem i swietnym UX dla codziennej pracy.

### Aktualny stan techniczny

Projekt zostal przebudowany z legacy statycznej aplikacji na React + Vite + TypeScript.

Kluczowe pliki:

- `index.html` - rootowy entrypoint Vite, laduje `/app/src/main.tsx`.
- `package.json` - rootowe skrypty: `dev`, `build`, `lint`, `preview`, `smoke`.
- `vite.config.ts` - rootowa konfiguracja Vite.
- `app/src/App.tsx` - glowne widoki aplikacji i wiekszosc logiki UI.
- `app/src/index.css` - aktualna warstwa wizualna.
- `app/src/domain/types.ts` - typy domenowe.
- `app/src/domain/defs.ts` - definicje formularzy i opcji ocen.
- `app/src/domain/scoring.ts` - logika draftow, scoringu i konwersji karty.
- `app/src/data/localProvider.ts` - lokalny provider demo oparty o `localStorage`.
- `app/src/data/supabaseProvider.ts` - provider Supabase.
- `app/src/data/seed.ts` - dane demo.
- `supabase/` - schemat, RLS i Edge Function `admin-users`.
- `legacy/` - stara statyczna wersja zachowana jako fallback referencyjny.
- `scripts/smoke-static.mjs` - szybki smoke check struktury projektu.
- `SMOKE_CHECKS.md` - reczna checklista QA.

Wazne: `node_modules/`, `dist/`, `app/node_modules/` i `app/dist/` sa ignorowane.

### Wykonane prace

1. Root aplikacji przelaczono na React/Vite.
2. Stara aplikacja statyczna zostala przeniesiona do `legacy/`.
3. Dodano workspace `app/` z React 19, Vite, TypeScript, ESLint, lucide-react i Supabase client.
4. Zbudowano nowy shell aplikacji: login, sidebar, topbar, start, formularz oceny, moj zespol, ewidencja, dashboard, raporty, panel admina.
5. Dodano role i guardy nawigacji:
   - `admin`, `director`: pelny dostep administracyjny,
   - `leader`, `assessor`: praca operacyjna w zakresie roli,
   - `viewer`: podglad i eksport bez edycji.
6. Dodano lokalne konta demo:
   - `admin / admin123`,
   - `dyrektor / dyrektor123`,
   - `lider01 / lider123`,
   - `lider02 / lider123`,
   - `lider / lider123`,
   - `oceniajacy / ocena123`,
   - `podglad / podglad123`.
7. Dodano lokalny provider v2 z osobnymi kluczami `oc_v2_*`, aby nie mieszac danych ze stara wersja.
8. Dodano provider Supabase z tabelami: `profiles`, `assessments`, `goals`, `specialists`, `departments`, `positions`, `periods`.
9. Dodano eksporty CSV, Excel HTML i JSON.
10. Dodano druk/podglad karty oceny.
11. Dodano dashboard z preferencjami `oc_v2_dashboard_prefs`, filtrami i eksportem CSV.
12. Dodano smoke script sprawdzajacy podstawowa integralnosc projektu.
13. Przed publikacja uruchomiono:
    - `npm run build` - OK,
    - `npm run lint` - OK,
    - `npm run smoke` - OK,
    - `git diff --check` - OK.

### Jak uruchomic

```powershell
npm install
npm run dev
```

Domyslny adres Vite:

```text
http://127.0.0.1:5173/
```

Build i kontrole:

```powershell
npm run build
npm run lint
npm run smoke
```

### Najwazniejsze zasady pracy

1. Najpierw przeczytaj `README.md`, `SMOKE_CHECKS.md`, `app/src/App.tsx`, `app/src/index.css`, `app/src/domain/*`, `app/src/data/*`.
2. Nie usuwaj `legacy/`, dopoki nowy Reactowy portal nie ma pelnego pokrycia funkcjonalnego.
3. Nie commituj sekretow. Publiczny Supabase anon key moze byc w frontendzie, ale `service_role` nigdy.
4. Zachowaj dzialanie trybu lokalnego demo nawet wtedy, gdy Supabase jest niedostepny.
5. Wszystkie zmiany testuj przynajmniej przez `npm run build`, `npm run lint`, `npm run smoke`.
6. Po zmianach UI uruchom aplikacje lokalnie i sprawdz ja w przegladarce na desktopie. Jesli przebudowujesz layout, sprawdz tez mniejszy viewport.
7. Nie wprowadzaj przypadkowych refaktorow. `App.tsx` jest duzy, wiec mozna go dzielic, ale tylko wtedy, gdy zmniejsza to ryzyko i poprawia utrzymanie.

### Priorytet 1: stabilizacja funkcjonalna

Wykonaj pelny smoke test z `SMOKE_CHECKS.md`, a wyniki dopisz do nowego pliku `SMOKE_RESULTS.md`.

Sprawdz szczegolnie:

- logowanie lokalne kazda rola,
- automatyczny powrot sesji po odswiezeniu,
- filtr zakresu lidera,
- tworzenie karty rozmowy/mail/system,
- zapis szkicu,
- zapis karty,
- podglad i edycje statusu karty,
- eksporty ewidencji,
- raporty i dashboard,
- panel admina: slowniki, specjalistow, cele, okresy, uzytkownikow,
- brak bledow w konsoli.

### Priorytet 2: architektura React

`app/src/App.tsx` jest zbyt duzy. Po stabilizacji rozdziel go na czytelne moduly:

- `components/shell/` - AppShell, Sidebar, Topbar,
- `components/ui/` - Button, Field, Modal, DataPanel, Metric, EmptyState, Toolbar,
- `features/auth/` - LoginScreen,
- `features/start/`,
- `features/evaluation/`,
- `features/team/`,
- `features/registry/`,
- `features/dashboard/`,
- `features/reports/`,
- `features/admin/`,
- `lib/export.ts`,
- `lib/format.ts`,
- `lib/security.ts`.

Nie zmieniaj zachowania przy dzieleniu komponentow. Najpierw przenies kod 1:1, potem poprawiaj.

### Priorytet 3: redesign SaaS premium

Przeprojektuj portal jako realne narzedzie SaaS, a nie landing page.

Kierunek:

- nowoczesny, profesjonalny SaaS dla liderow i dzialow jakosci,
- glass design uzyty selektywnie: topbar, side panels, modal, command surfaces, summary rail,
- spokojna, czytelna paleta z mocnym kontrastem, nie jednokolorowa,
- tlo aplikacji moze miec subtelna glebie, ale nie moze odciagac uwagi od danych,
- brak dekoracyjnych orbow i przypadkowych blobow,
- typografia: mocna hierarchia, czytelne tabele, zwarte etykiety, brak ujemnego letter-spacing,
- radii maksymalnie ok. 8px dla wiekszosci UI,
- karty tylko tam, gdzie reprezentuja powtarzalny obiekt, modal albo narzedzie; nie zagniezdzaj kart w kartach,
- dashboard ma byc gesty informacyjnie, ale latwy do skanowania,
- animacje maja pomagac w orientacji: przejscia widokow, hover, selected state, zapisywanie, filtrowanie, modale, drag/reorder paneli,
- respektuj `prefers-reduced-motion`.

Wymagania redesignu:

1. Zbuduj design system w CSS:
   - tokens: colors, surfaces, borders, shadows, blur, radii, spacing, z-index, motion,
   - typography scale,
   - button variants,
   - form fields,
   - tables,
   - status badges,
   - chart/list panels,
   - modals/drawers,
   - focus states.
2. Zmien login na premium SaaS:
   - widoczna marka Oceniator,
   - szybkie wejscie do lokalnego demo,
   - jasne rozroznienie trybu Supabase/local,
   - bez marketingowego hero, bardziej product-led.
3. Zmien sidebar:
   - bardziej kompaktowy,
   - czytelne aktywne stany,
   - mozliwy collapsed mode,
   - ikony lucide, rowne optycznie.
4. Zmien topbar:
   - breadcrumb / nazwa widoku,
   - status providera,
   - profil i wylogowanie,
   - subtelny glass blur.
5. Zmien start:
   - dashboard operacyjny "co mam zrobic teraz",
   - szybkie akcje: nowa ocena, ewidencja, dashboard, admin,
   - ostatnie/najpilniejsze karty,
   - KPI na obecny okres.
6. Zmien formularz oceny:
   - lepszy progress i summary rail,
   - bardziej intuicyjne przechodzenie po sekcjach,
   - szybka zmiana liczby kontaktow,
   - ocenianie `1 / 0.5 / 0 / N/D` jako stabilne segmented controls,
   - notatki per kryterium/kontakt bez rozpychania layoutu,
   - zawsze widoczny wynik i CTA zapisu.
7. Zmien ewidencje:
   - dense table-first UI,
   - filtry w toolbarze,
   - statusy i score badges,
   - szybki podglad/edycja w drawerze albo modal,
   - eksporty jako menu akcji.
8. Zmien dashboard:
   - modulowy grid,
   - KPI, trend, ranking, ryzyka, slabe kryteria,
   - panele drag/reorder lub przynajmniej zapamietywana kolejnosc,
   - czytelne empty states,
   - zadnych przypadkowych pseudo-metryk.
9. Zmien panel admina:
   - taby albo split layout,
   - slowniki, cele, okresy, specjalisci i uzytkownicy w przewidywalnym ukladzie,
   - potwierdzenia dla akcji destrukcyjnych,
   - widoczny unsaved state.
10. Responsywnosc:
   - desktop-first, bo aplikacja jest narzedziem operacyjnym,
   - przy malym viewport nie moze byc chaosu ani poziomego nachodzenia,
   - jezeli pelna wersja mobilna jest poza zakresem, pokaz czytelny komunikat o wymaganej szerokosci i zadbaj o login.

### Priorytet 4: animacje i mikrointerakcje

Dodaj subtelny motion system:

- wejscie widokow: opacity + translateY 6-10px,
- hover: szybkie 120-180ms,
- modal/drawer: 180-240ms z easingiem,
- skeleton/loading states dla providerow,
- toast/success po zapisie,
- reduced motion fallback.

Nie dodawaj animacji, ktore opozniaja prace lub utrudniaja czytanie tabel.

### Priorytet 5: Supabase i bezpieczenstwo

Zweryfikuj:

- zgodnosc mapowania `assessments` z `supabase/schema.sql`,
- RLS i role uzytkownikow,
- tworzenie uzytkownikow przez Edge Function `admin-users`,
- zachowanie aplikacji przy braku dostepu admina,
- fallback lub komunikat, gdy Supabase jest niedostepny,
- brak `dangerouslySetInnerHTML` z danymi uzytkownika,
- poprawne escape przy eksporcie Excel HTML i druku.

### Priorytet 6: testy

Dodaj minimum:

- smoke script nadal zielony,
- testy jednostkowe dla `scoring.ts`,
- testy mapowania providerow, jesli latwe do odizolowania,
- e2e Playwright dla:
  - login local demo,
  - utworzenie karty,
  - karta widoczna w ewidencji,
  - filtr lidera,
  - viewer bez dostepu do edycji.

### Kryteria akceptacji

Prace mozna uznac za gotowe, gdy:

- `npm run build`, `npm run lint`, `npm run smoke` przechodza,
- core flow dziala w trybie lokalnym,
- Supabase flow ma jasny status: dziala albo opisane blokery,
- UI nie ma nachodzacych elementow, overflow i nieczytelnych tabel,
- portal wyglada jak dopracowany SaaS, a nie prototyp,
- animacje sa plynne i nie przeszkadzaja,
- README i SMOKE_CHECKS sa aktualne,
- finalna odpowiedz zawiera liste zmian, testy i pozostale ryzyka.

## Pytania do wlasciciela produktu

Odpowiedzi na te pytania pomoga doprecyzowac kolejny prompt i redesign:

1. Czy repo `Oceniator-V2` ma pozostac prywatne, czy docelowo publiczne?
2. Czy nowa wersja ma byc deploymentem na GitHub Pages, Vercel, Supabase Hosting czy innym hostingu?
3. Jaka jest docelowa grupa uzytkownikow: tylko wewnetrzny zespol jakosci, liderzy operacyjni, dyrekcja, czy rowniez zewnetrzni audytorzy?
4. Ktory widok jest najwazniejszy w codziennej pracy: formularz oceny, ewidencja, dashboard czy panel admina?
5. Czy portal powinien miec brand PeP/P24, neutralny brand Oceniator, czy mozliwosc white-label?
6. Jakie kolory sa niedozwolone albo wymagane firmowo?
7. Czy preferujesz jasny motyw jako domyslny, ciemny, czy automatyczny z przelacznikiem?
8. Czy aplikacja musi dzialac wygodnie na mobile, czy wystarczy desktop/tablet plus komunikat dla malych ekranow?
9. Jakie sa najwazniejsze KPI na dashboardzie dla dyrektora?
10. Jakie sa najwazniejsze KPI dla lidera?
11. Czy lider ma widziec tylko swoj zespol, czy porownania do innych liderow?
12. Czy oceniajacy moze edytowac karty po zapisie, czy tylko admin/lider?
13. Jak powinien wygladac workflow statusow kart: `Do weryfikacji`, `W weryfikacji`, `Zatwierdzona`, `Archiwum` - czy brakuje statusow?
14. Czy potrzebna jest historia zmian i audyt: kto, kiedy, co zmienil?
15. Czy formularze ocen sa finalne, czy kryteria/wagi maja byc w pelni edytowalne z panelu admina?
16. Czy eksport Excel ma byc prawdziwym `.xlsx`, czy obecny HTML `.xls` jest wystarczajacy?
17. Czy raporty PDF maja byc generowane w przegladarce, czy przez backend/Edge Function?
18. Czy Supabase jest docelowym zrodlem prawdy, czy local demo ma pozostac rownie wazne?
19. Czy mamy migrowac dane ze starego `legacy/localStorage` do nowych kluczy `oc_v2_*`?
20. Jakie 3 aplikacje SaaS sa dobrymi inspiracjami wizualnymi dla Ciebie?
21. Czy glass design ma byc subtelny i profesjonalny, czy bardziej futurystyczny?
22. Czy chcesz animacje bardzo dyskretne, czy bardziej widowiskowe?
23. Czy potrzebne sa powiadomienia/toasty i centrum aktywnosci?
24. Czy aplikacja ma miec role/permission matrix konfigurowana w UI?
25. Co musi byc gotowe jako pierwsze do demo?

# Oceniator — portal oceny jakości

Portal do oceny jakości obsługi rozmów, maili i działań systemowych. Umożliwia przygotowanie oceny, zapis szkicu, przegląd kart i statusów, pracę z zespołem, analizę wyników i eksport raportów.

**Zakres interfejsu: PC, od 1280×720 do 1920×1080. Telefon pozostaje poza zakresem obecnej przebudowy.**

## Aktualna wersja

- React 19, TypeScript, Vite; frontend wdrażany na Vercel.
- Supabase: logowanie Google, baza danych, RLS i funkcje administracyjne.
- Wspólny styl desktopowy: start, formularz, Ewidencja, zespół, Analityka, Raporty, Administracja i okna szczegółów.
- Widoczne szkice na starcie; jedna wyszukiwarka w Ewidencji i jedno menu eksportu wszystkich wyników po filtrach (CSV, Excel, JSON).
- Ekran logowania zachowuje poprzedni wygląd z animowanym tłem.
- Dotychczasowe kryteria i sposób obliczania wyniku pozostają zachowane.

[Portal produkcyjny](https://oceniator-v2-pub-staszko.vercel.app) · [Audyt i plan rozwoju](docs/PORTAL_AUDIT.md)

## Uruchomienie lokalne

```sh
npm ci
npm run dev
```

Otwórz adres podany przez Vite, zwykle http://127.0.0.1:5173. Lokalny tryb demonstracyjny przechowuje dane w przeglądarce i jest oddzielony od produkcji. Konta demo są zdefiniowane w `app/src/data/localProvider.ts`.

Konfiguracja oddzielnego środowiska Supabase: `.env.example`. Klucza `service_role` nie wolno umieszczać we frontendzie ani w zmiennych `VITE_*`.

## Weryfikacja

```sh
npm run build
npm run lint
npm run test -- --pool=threads --maxWorkers=2
npm run smoke
```

Tryb threads ogranicza problemy startu procesów na Windows. Testy integracyjne wymagają osobnego środowiska opisanego w [SUPABASE_INTEGRATION.md](SUPABASE_INTEGRATION.md). Ich pominięcie nie potwierdza poprawności RLS ani całego procesu produkcyjnego.

## Publikacja

Integracja GitHub → Vercel buduje gałęzie jako Preview, a `main` jako produkcję. Build: `npm run build`; katalog wynikowy: `dist`; konfiguracja: `vercel.json`. Zmienne i adresy przekierowania OAuth konfiguruj osobno dla Preview i Production.

## Struktura

- `app/src/features/`: widoki portalu i portal specjalisty.
- `app/src/portal.css`: wspólne style PC; starsze style pozostają w `index.css` i są stopniowo porządkowane.
- `app/src/components/`: współdzielone tabele, menu i kontrolki.
- `app/src/domain/`: kryteria, obliczenia, typy i reguły dostępu.
- `app/src/data/`: providery Supabase i lokalny oraz dane demo.
- `app/src/config/navigation.ts`, `app/src/lib/locationHash.ts`, `app/src/App.tsx`: nawigacja i routing oparty o hash.
- `supabase/`: schematy, polityki i Edge Functions. Skrypty wymagają przeglądu przed użyciem; nie uruchamiaj automatycznie całego katalogu.
- `legacy/`: archiwalny interfejs referencyjny, poza bieżącą aplikacją produkcyjną.

## Dalsze prace

Uproszczenie pracy z kryteriami formularza, przejście pełnego procesu oceny dla każdej roli, porządkowanie języka i CSS oraz dalsze uproszczenie raportów. Zmiany UI nie stanowią zakończonego audytu bezpieczeństwa. Kwestie dostępu i historycznych danych logowania wymagające osobnego zamknięcia opisano w audycie.

Data i godzina:
2026-05-31 23:35:48 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `app/src/data/supabaseProvider.ts`
3. `app/src/utils/storage.ts`

Znalezione ryzyka:
1. Backendowy log audytu w `admin-users` wypisywał `auditError.message`, co mogło ujawnić zbyt szczegółowe informacje o błędzie w logach.
2. `npm audit` zgłosił wysoką podatność w `xlsx` bez dostępnej poprawki.
3. W `app/src/data/supabaseProvider.ts` nadal istnieją inne `console.warn` wypisujące surowe błędy z Supabase i mogą wymagać późniejszego przeglądu.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza bezpieczna poprawka backend/security w tej iteracji, bez zmiany schematu danych, auth ani odpowiedzi API.
Co zmieniono:
Usunięto treść błędu z logu `admin_history` w edge function; w logu zostaje tylko ogólny komunikat.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
Uruchomione komendy:
`npm run lint`
`npm run build`
`npm test`
`npm audit --audit-level=moderate`
Wynik lint:
PASS
Wynik build:
PASS
Wynik testów:
PASS
Wynik audit:
FAIL - wysokie ryzyko w zależności `xlsx`, brak dostępnej poprawki
Commit:
Not yet created
Ryzyko po zmianie:
Niższe. Log audytu nie ujawnia już szczegółów błędu, ale nadal wymaga obserwacji, czy dalsze warningi nie wypisują zbyt dużo.
Co sprawdzić ręcznie:
Zweryfikować, czy tworzenie użytkownika nadal działa po stronie edge function i czy brak szczegółu błędu nie utrudnia diagnostyki.
Następny rekomendowany krok:
Zacząć od sanitizacji pozostałych backendowych `console.warn` w `app/src/data/supabaseProvider.ts` albo zająć się zależnością `xlsx`, która blokuje czysty audit.

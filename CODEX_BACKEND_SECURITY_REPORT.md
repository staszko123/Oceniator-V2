Data i godzina:
2026-06-01 12:12:14 +02:00
Tryb:
Backend security loop, report-only review

Skanowane obszary:
1. `package.json` i `app/package.json`
2. `supabase/functions/admin-users/index.ts`
3. `tests/backend-contract.test.ts`

Znalezione bezpieczne obszary:
1. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` w `admin-users` ma zwracac `400`, zamiast cichego fallbacku do `viewer`.
2. Rozwazyc ograniczenie user-facing bledow z `createError?.message` i `upsertError.message`, bo dzis zmieniloby to komunikaty API dla administratora.
3. Dalej monitorowac `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez dostepnej poprawki upstream.

Wybrane zadanie:
Status:
NEEDS_REVIEW
Poziom ryzyka:
P3
Dlaczego wybrane:
To najnizsze ryzyko pozostale po ostatnich malych utwardzeniach `admin-users`. Dalsze zmiany nie sa juz czysto defensywnymi naglowkami lub guardami i ingerowalyby w kontrakt API albo widoczne komunikaty bledu.
Co zmieniono:
Nie zmieniano kodu. Udokumentowano decyzje do przegladu: dzisiejszy bieg pozostawia fallback `role -> viewer` oraz surowsze komunikaty bledow bez zmian, zeby nie wprowadzac cichej zmiany zachowania bez akceptacji.
Zmienione pliki:
`CODEX_BACKEND_SECURITY_REPORT.md`
Uruchomione komendy:
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Bez zmian w kodzie. Edge function nadal mapuje nieznana `role` do `viewer`, co jest bezpieczne od strony uprawnien, ale ukrywa blad wejscia i utrudnia jednoznaczna walidacje kontraktu. Nadal zwraca tez surowsze bledy z Supabase przy nieudanym tworzeniu lub upsercie uzytkownika.
Co sprawdzic recznie:
Podjac decyzje, czy panel admina ma pokazywac jawny blad `400` dla nieobslugiwanej `role` i czy odpowiedzi `create user` / `upsert profile` powinny zostac znormalizowane do bezpieczniejszych komunikatow.
Nastepny rekomendowany krok:
Jesli akceptowalne jest zaciecie kontraktu API, zmienic `admin-users`, zeby odrzucal nieprawidlowa `role` kodem `400`, a potem dopisac test kontraktowy i komunikat UI.

---

Data i godzina:
2026-06-01 11:28:01 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `package.json`
2. `supabase/functions/admin-users/index.ts`
3. `tests/backend-contract.test.ts`

Znalezione bezpieczne obszary:
1. Dodac `X-Permitted-Cross-Domain-Policies: none` do odpowiedzi `admin-users`, zeby zablokowac legacy cross-domain policy loading dla administracyjnego endpointu.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia kontrakt API.
3. Dalej monitorowac lub ograniczyc uzycie `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najnizsze ryzyko w aktualnym stanie repo: dodaje tylko kolejny defensywny naglowek odpowiedzi edge function i nie zmienia auth, RLS, schematu, payloadu ani poprawnych odpowiedzi API.
Co zmieniono:
Dodano `X-Permitted-Cross-Domain-Policies: none` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Minimalnie nizsze. Odpowiedz funkcji admina blokuje teraz rowniez legacy cross-domain policy loading, ale nadal pozostaje decyzja produktowa dla nieprawidlowej `role`.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca `X-Permitted-Cross-Domain-Policies: none`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

---

Data i godzina:
2026-06-01 12:57:47 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `package.json` i `app/package.json`
2. `supabase/functions/admin-users/index.ts`
3. `tests/backend-contract.test.ts`

Znalezione bezpieczne obszary:
1. Dodac `CDN-Cache-Control: no-store` do odpowiedzi `admin-users`, zeby ograniczyc ryzyko cache po stronie CDN lub proxy dla odpowiedzi administracyjnej.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia kontrakt API.
3. Rozwazyc pozniejsze znormalizowanie user-facing bledow z `createError?.message` i `upsertError.message`, bo dzis zmieniloby to komunikaty widoczne dla administratora.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security pozostajaca bez wchodzenia w walidacje wejscia albo kontrakt widocznych bledow API. Utwardza tylko polityke braku cache dla odpowiedzi edge function.
Co zmieniono:
Dodano `CDN-Cache-Control: no-store` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
`CODEX_BACKEND_SECURITY_REPORT.md`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Minimalnie nizsze. Odpowiedzi funkcji admina sa teraz bardziej jednoznacznie oznaczone jako niecacheowalne rowniez dla warstwy CDN/proxy, bez zmiany auth, RLS, schematu, payloadu ani poprawnych odpowiedzi API.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca `CDN-Cache-Control: no-store`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

---

Data i godzina:
2026-06-01 09:57:38 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `package.json`
2. `supabase/functions/admin-users/index.ts`
3. `tests/backend-contract.test.ts`

Znalezione bezpieczne obszary:
1. Dodac `Permissions-Policy` do odpowiedzi `admin-users`, zeby zablokowac niepotrzebne uprawnienia przegladarki przy konsumpcji administracyjnego endpointu.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia kontrakt API.
3. Dalej monitorowac `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najnizsze ryzyko pozostale po poprzednich utwardzeniach naglowkow `admin-users`: dodaje kolejny defensywny naglowek odpowiedzi i nie zmienia auth, RLS, schematu, payloadu ani poprawnych odpowiedzi API.
Co zmieniono:
Dodano `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Minimalnie nizsze. Odpowiedz funkcji admina jawnie wyłącza kilka browser capabilities, ale nadal pozostaje decyzja produktowa dla nieprawidlowej `role`.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca rowniez `Permissions-Policy`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

---

Data i godzina:
2026-06-01 10:42:40 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `package.json`

Znalezione bezpieczne obszary:
1. Dodac `Expires: 0` do odpowiedzi `admin-users`, zeby domknac polityke braku cache dla odpowiedzi administracyjnej w starszych i posredniczacych cache.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia kontrakt API.
3. Dalej monitorowac lub ograniczyc uzycie `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security w obecnym stanie repo: wzmacnia tylko polityke anty-cache odpowiedzi edge function i nie zmienia auth, RLS, schematu, payloadu ani poprawnych odpowiedzi API.
Co zmieniono:
Dodano `Expires: 0` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka. Pozostawiono bez zmian inne lokalne, wczesniej rozpoczete modyfikacje w tych samych plikach.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Nizsze. Odpowiedzi funkcji admina sa teraz bardziej jednoznacznie niecacheowalne, ale nadal pozostaje decyzja produktowa dla nieprawidlowej `role`.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca `Expires: 0`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

---

Data i godzina:
2026-06-01 09:13:13 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `package.json`

Znalezione bezpieczne obszary:
1. Dodac `X-Robots-Tag: noindex, nofollow` do odpowiedzi `admin-users`, zeby zmniejszyc ryzyko indeksowania administracyjnego endpointu i jego odpowiedzi przez crawlery.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia kontrakt API.
3. Dalej monitorowac `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security pozostajaca po wczesniejszym hardeningu funkcji admina: utwardza tylko naglowki odpowiedzi i nie zmienia auth, RLS, schematu, payloadu ani poprawnych odpowiedzi API.
Co zmieniono:
Dodano `X-Robots-Tag: noindex, nofollow` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Minimalnie nizsze. Endpoint administracyjny wysyla teraz takze sygnal dla crawlerow, ze odpowiedzi nie powinny byc indeksowane, ale nadal pozostaje decyzja produktowa dla nieprawidlowej `role`.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca `X-Robots-Tag: noindex, nofollow`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

---

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

---

Data i godzina:
2026-05-31 23:54:10 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `app/src/data/supabaseProvider.ts`
2. `app/src/domain/errors.ts`
3. `supabase/functions/admin-users/index.ts`

Znalezione bezpieczne obszary:
1. Sanitizacja warningów w `app/src/data/supabaseProvider.ts`, które nadal logowały surowe obiekty błędów z Supabase.
2. Dalsze utwardzenie walidacji payloadu w `supabase/functions/admin-users/index.ts`, zwłaszcza długości `full_name` i `leader_scope`.
3. Utrzymanie raportowania podatności `xlsx`, bo `npm audit` nadal zgłasza wysokie ryzyko bez dostępnej poprawki.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
Najmniejsza zmiana bez wpływu na auth, RLS, schemat, odpowiedzi API ani zapis danych; ogranicza tylko ujawnianie treści błędów w logach diagnostycznych.
Co zmieniono:
Dodano helper `getSafeErrorContext`, który zachowuje tylko `kind`, `code`, `status` i `name`, a następnie podmieniono nim warningi Supabase w providerze oraz dopisano test jednostkowy tej sanitizacji.
Zmienione pliki:
`app/src/domain/errors.ts`
`app/src/domain/errors.test.ts`
`app/src/data/supabaseProvider.ts`
Uruchomione komendy:
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik lint:
PASS
Wynik build:
PASS
Wynik testów:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysoką podatność bez dostępnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Niższe. Warningi nie wypisują już pełnych treści błędów ani `error.message`, ale nadal zachowują podstawowy kontekst operacyjny.
Co sprawdzić ręcznie:
Zweryfikować, czy podczas błędu Supabase w konsoli nadal widać wystarczający kontekst diagnostyczny (`kind`, `code`, `status`, `name`) bez treści odpowiedzi backendu.
Następny rekomendowany krok:
Najbezpieczniej dalej utwardzić `supabase/functions/admin-users/index.ts` o ograniczenia długości i normalizację pól wejściowych, bo to pozostaje małą zmianą backendową bez ruszania RLS.

---

Data i godzina:
2026-06-01 00:09:10 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `package.json`

Znalezione bezpieczne obszary:
1. Dodać limity długości dla `full_name` w `supabase/functions/admin-users/index.ts`, aby nie wpuszczać nadmiernie długich danych do profilu i logów.
2. Dodać limity długości dla `leader_scope` w `supabase/functions/admin-users/index.ts`, aby zmniejszyć ryzyko zanieczyszczania scope i rekordów powiązanych.
3. Nadal monitorować podatność `xlsx`, bo `npm audit` wciąż zgłasza wysokie ryzyko bez dostępnej poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security w aktualnym stanie repo: zawęża tylko nieprawidłowe wejście w edge function i nie zmienia auth, RLS, schematu ani poprawnych payloadów.
Co zmieniono:
Dodano stałe `MAX_FULL_NAME_LENGTH` i `MAX_LEADER_SCOPE_LENGTH` w `admin-users`, odrzucające wartości dłuższe niż 120 znaków, oraz dopisano statyczny test kontraktowy pilnujący obecności tych guardów.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm test`
`npm run build`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik testów:
PASS
Wynik build:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysoką podatność bez dostępnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Niższe. Edge function nie przyjmie już skrajnie długiego `full_name` ani `leader_scope`, ale nadal warto ujednolicić dalszą normalizację pól wejściowych.
Co sprawdzić ręcznie:
Zweryfikować, czy formularz tworzenia użytkownika pokazuje sensowny komunikat, gdy administrator poda nazwę lub scope dłuższe niż 120 znaków.
Następny rekomendowany krok:
Najbezpieczniej dodać równie mały guard długości dla `email` w `supabase/functions/admin-users/index.ts` albo opisać akceptowane limity w UI administratora, żeby walidacja była spójna po obu stronach.

---

Data i godzina:
2026-06-01 00:57:19 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `package.json`

Znalezione bezpieczne obszary:
1. Dodac limit dlugosci dla `email` w `supabase/functions/admin-users/index.ts`, zeby odrzucac nadmiernie dlugie dane zanim trafia do Auth, profilu i logow.
2. Rozwazyc jawne odrzucanie nieprawidlowej `role` zamiast cichego fallbacku do `viewer`, ale to zmienia zachowanie API i jest odrobine mniej bezpieczne do zrobienia bez decyzji.
3. Nadal monitorowac podatnosc `xlsx`, bo `npm audit` wciaz zglasza wysokie ryzyko bez dostepnej poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security w obecnym stanie repo: dodaje tylko kolejny guard walidacji wejscia w tej samej edge function i nie rusza auth, RLS, schematu ani poprawnych payloadow.
Co zmieniono:
Dodano `MAX_EMAIL_LENGTH = 254` w `admin-users`, odrzucajace `email` dluzszy niz 254 znaki, oraz dopisano statyczny test kontraktowy pilnujacy obecnosci tego guardu.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Nizsze. Edge function odrzuci teraz skrajnie dlugie adresy email przed tworzeniem konta i upsertem profilu, ale nadal pozostaje decyzja czy nieprawidlowa rola ma byc jawnie odrzucana.
Co sprawdzic recznie:
Zweryfikowac, czy formularz tworzenia uzytkownika pokazuje sensowny komunikat, gdy administrator poda email dluzszy niz 254 znaki.
Nastepny rekomendowany krok:
Najbezpieczniej ujednolicic walidacje po stronie UI administratora z limitami edge function albo przygotowac NEEDS_REVIEW dla decyzji, czy niepoprawna `role` ma zwracac blad 400 zamiast fallbacku do `viewer`.

---

Data i godzina:
2026-06-01 01:42:35 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `app/src/lib/security.ts`

Znalezione bezpieczne obszary:
1. Odrzucic znaki kontrolne w `email`, zeby nie przepuszczac nietypowych znakow do Auth i logow.
2. Odrzucic znaki kontrolne w `full_name`, bo pole trafia do `profiles` i opisu wpisu `admin_history`.
3. Odrzucic znaki kontrolne w `leader_scope`, zeby nie zanieczyszczac danych zakresu i powiazanych filtrow.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza bezpieczna zmiana backend/security w obecnym stanie repo: utwardza walidacje wejscia w tej samej edge function, bez zmiany auth, RLS, schematu ani poprawnych payloadow.
Co zmieniono:
Dodano helper `hasUnsafeControlChars` oraz guardy odrzucajace znaki kontrolne w `email`, `full_name` i `leader_scope`, a test kontraktowy rozszerzono o pilnowanie tych zabezpieczen.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Nizsze. Funkcja nie zapisze juz payloadow z ukrytymi znakami kontrolnymi w polach tekstowych administratora, ale nadal pozostaje decyzja czy niepoprawna `role` ma byc jawnie odrzucana.
Co sprawdzic recznie:
Zweryfikowac, czy formularz admina pokazuje sensowny blad po podaniu `full_name`, `leader_scope` albo `email` z nowa linia lub innym znakiem kontrolnym.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac blad 400 zamiast fallbacku do `viewer`, bo to zmienia zachowanie API.

---

Data i godzina:
2026-06-01 02:27:19 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `package.json`

Znalezione bezpieczne obszary:
1. Dodac `Cache-Control: no-store` do odpowiedzi `admin-users`, zeby ograniczyc ryzyko przechowywania odpowiedzi z danymi kont i komunikatami bledow.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia zachowanie API.
3. Dalej monitorowac lub ograniczyc uzycie `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security w obecnym stanie repo: utwardza tylko naglowki odpowiedzi edge function i nie zmienia auth, RLS, schematu, payloadu ani prawidlowych odpowiedzi API.
Co zmieniono:
Dodano `Cache-Control: no-store` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Nizsze. Odpowiedzi funkcji admina nie powinny byc cache'owane przez posrednie warstwy ani przegladarke, ale nadal pozostaje decyzja produktowa dla nieprawidlowej `role`.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca `Cache-Control: no-store`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

---

Data i godzina:
2026-06-01 07:42:12 +02:00
Tryb:
Backend security loop, report-only review

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `package.json`

Znalezione bezpieczne obszary:
1. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` w `admin-users` ma zwracac `400`, zamiast cichego fallbacku do `viewer`.
2. Rozwazyc pozniejsze uscislenie user-facing bledow z `createError?.message` i `upsertError.message`, bo dzis zmieniloby to komunikaty API dla administratora.
3. Dalej monitorowac `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
NEEDS_REVIEW
Poziom ryzyka:
P3
Dlaczego wybrane:
To najnizsze ryzyko pozostale po serii malych utwardzen. Zmiana zachowania dla nieprawidlowej `role` jest backendowo sensowna, ale modyfikuje kontrakt API i moze zmienic to, co widzi formularz administratora.
Co zmieniono:
Nie zmieniano kodu. Udokumentowano decyzje do przegladu: dzisiejszy bieg pozostawia fallback `role -> viewer` bez zmian, zeby nie wprowadzac cichej zmiany zachowania bez akceptacji.
Zmienione pliki:
`CODEX_BACKEND_SECURITY_REPORT.md`
Uruchomione komendy:
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Bez zmian w kodzie. Edge function nadal mapuje nieznana `role` do `viewer`, co jest bezpieczne od strony uprawnien, ale ukrywa blad wejscia i utrudnia jednoznaczna walidacje kontraktu.
Co sprawdzic recznie:
Podjac decyzje, czy panel admina ma pokazywac jawny blad `400` dla nieobslugiwanej `role`, czy zachowac dzisiejszy fallback do `viewer`.
Nastepny rekomendowany krok:
Jesli akceptowalne jest zaciecie kontraktu API, zmienic `admin-users`, zeby odrzucal nieprawidlowa `role` kodem `400`, a potem dopisac test kontraktowy i komunikat UI.

---

Data i godzina:
2026-06-01 06:57:48 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `package.json`

Znalezione bezpieczne obszary:
1. Dodac `Pragma: no-cache` do odpowiedzi `admin-users`, zeby starsze klienty i posrednie warstwy dostaly dodatkowy sygnal, ze odpowiedzi administracyjnej nie nalezy cache'owac.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia kontrakt API.
3. Dalej monitorowac lub ograniczyc uzycie `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security pozostajaca po wczesniejszym hardeningu naglowkow: wzmacnia polityke braku cache dla odpowiedzi administracyjnej i nie zmienia auth, RLS, schematu, payloadu ani poprawnych odpowiedzi API.
Co zmieniono:
Dodano `Pragma: no-cache` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Minimalnie nizsze. Odpowiedzi funkcji admina przekazuja teraz takze starszym klientom i proxy, ze nie powinny byc cache'owane, ale nadal pozostaje decyzja produktowa dla nieprawidlowej `role`.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca rowniez `Pragma: no-cache`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

---

Data i godzina:
2026-06-01 06:12:20 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `package.json`

Znalezione bezpieczne obszary:
1. Dodac waski `Content-Security-Policy` do odpowiedzi `admin-users`, zeby zablokowac ladowanie tresci aktywnych i dodatkowo utwardzic odpowiedz API.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia zachowanie API.
3. Dalej monitorowac lub ograniczyc uzycie `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security w obecnym stanie repo: utwardza tylko naglowki odpowiedzi edge function i nie zmienia auth, RLS, schematu, payloadu ani poprawnych odpowiedzi API.
Co zmieniono:
Dodano `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Nizsze. Odpowiedz funkcji admina jest teraz twardsza wobec ladowania jakichkolwiek zasobow lub osadzania, ale nadal pozostaje decyzja produktowa dla nieprawidlowej `role`.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

---

Data i godzina:
2026-06-01 05:27:19 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `package.json`

Znalezione bezpieczne obszary:
1. Dodac `Referrer-Policy: no-referrer` do odpowiedzi `admin-users`, zeby ograniczyc wysylanie adresu z panelu administracyjnego jako referrer.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia zachowanie API.
3. Dalej monitorowac lub ograniczyc uzycie `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security w obecnym stanie repo: utwardza tylko naglowki odpowiedzi edge function i nie zmienia auth, RLS, schematu, payloadu ani poprawnych odpowiedzi API.
Co zmieniono:
Dodano `Referrer-Policy: no-referrer` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
FAIL - istniejaca awaria w `app/src/components/data-table/exportTable.test.ts` zwiazana z oczekiwaniem arkusza `"Quarterly evaluation registry "` vs faktyczny `"Quarterly evaluation registry e"`
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Nizsze. Odpowiedzi funkcji admina nie wysylaja juz referrera, ale nadal pozostaje decyzja produktowa dla nieprawidlowej `role`.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca `Referrer-Policy: no-referrer`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

Data i godzina:
2026-06-01 03:57:25 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `app/package.json`

Znalezione bezpieczne obszary:
1. Dodac `X-Content-Type-Options: nosniff` do odpowiedzi `admin-users`, zeby przegladarka nie probowala zgadywac typu odpowiedzi z danymi administracyjnymi.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia zachowanie API.
3. Dalej monitorowac lub ograniczyc uzycie `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security w obecnym stanie repo: utwardza tylko naglowki odpowiedzi edge function i nie zmienia auth, RLS, schematu, payloadu ani poprawnych odpowiedzi API.
Co zmieniono:
Dodano `X-Content-Type-Options: nosniff` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Nizsze. Odpowiedzi funkcji admina sa teraz twardsze wobec sniffowania typu tresci, ale nadal pozostaje decyzja produktowa dla nieprawidlowej `role`.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca `X-Content-Type-Options: nosniff`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

---

Data i godzina:
2026-06-01 04:42:15 +02:00
Tryb:
Backend and security loop, 15 min

Skanowane obszary:
1. `supabase/functions/admin-users/index.ts`
2. `tests/backend-contract.test.ts`
3. `app/package.json`

Znalezione bezpieczne obszary:
1. Dodac `X-Frame-Options: DENY` do odpowiedzi `admin-users`, zeby utrudnic osadzanie odpowiedzi administracyjnej w ramkach przegladarki.
2. Przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast cichego fallbacku do `viewer`, bo to zmienia kontrakt API.
3. Dalej monitorowac lub ograniczyc uzycie `xlsx`, bo `npm audit` nadal raportuje wysokie ryzyko bez poprawki upstream.

Wybrane zadanie:
Status:
DONE
Poziom ryzyka:
P3
Dlaczego wybrane:
To najmniejsza zmiana backend/security w obecnym stanie repo: utwardza tylko naglowki odpowiedzi edge function i nie zmienia auth, RLS, schematu, payloadu ani poprawnych odpowiedzi API.
Co zmieniono:
Dodano `X-Frame-Options: DENY` do wspolnych naglowkow `admin-users` oraz rozszerzono test kontraktowy, zeby pilnowal obecnosci tego naglowka.
Zmienione pliki:
`supabase/functions/admin-users/index.ts`
`tests/backend-contract.test.ts`
Uruchomione komendy:
`npm test -- --run tests/backend-contract.test.ts`
`npm run lint`
`npm run build`
`npm test`
`npm run smoke`
`npm audit --audit-level=moderate`
Wynik testu kontraktowego:
PASS
Wynik lint:
PASS
Wynik build:
PASS
Wynik testow:
PASS
Wynik smoke:
PASS
Wynik audit:
FAIL - `xlsx` nadal ma wysokie ryzyko bez dostepnej poprawki upstream
Commit:
Not yet created
Ryzyko po zmianie:
Nizsze. Odpowiedzi funkcji admina sa teraz twardsze wobec osadzania w ramkach, ale nadal pozostaje decyzja produktowa dla nieprawidlowej `role`.
Co sprawdzic recznie:
Zweryfikowac w narzedziach sieciowych, ze odpowiedz `POST /functions/v1/admin-users` zwraca `X-Frame-Options: DENY`.
Nastepny rekomendowany krok:
Najbezpieczniej przygotowac NEEDS_REVIEW dla decyzji, czy nieprawidlowa `role` ma zwracac `400` zamiast fallbacku do `viewer`, bo to kolejna mala zmiana backendowa, ale zmienia kontrakt API.

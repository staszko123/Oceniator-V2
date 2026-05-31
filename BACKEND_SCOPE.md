# Oceniator v2 backend scope

## Cel
Jedno spójne źródło prawdy dla danych, ról i reguł biznesowych. Backend ma być przewidywalny, łatwy do audytu i gotowy do pracy zespołowej bez dublowania logiki po stronie UI.

## Źródła danych
- `localProvider` - tryb demo i lokalny fallback.
- Supabase Auth - logowanie i tożsamość użytkownika.
- Supabase Postgres - dane produkcyjne, role, oceny, słowniki, okresy.
- Supabase Edge Functions - operacje administracyjne, które wymagają uprawnień serwisowych.

## Encje
- `profiles` - konto użytkownika, rola, zakres lidera, aktywność.
- `specialists` - katalog specjalistów przypisanych do liderów.
- `departments` - słownik działów.
- `positions` - słownik stanowisk.
- `periods` - okresy rozliczeniowe.
- `goals` - cele i progi jakościowe.
- `assessments` - karty oceny, status, scoring, komentarze, historia.
- `user_drafts` - szkice formularzy przypisane do użytkownika i typu oceny.
- `assessment_comments` - komentarze operacyjne do kart oceny.
- `notifications` - powiadomienia użytkownika z linkiem do powiązanej encji.
- `user_preferences` - preferencje użytkownika niewpływające na model biznesowy.
- `admin_history` - ślad zmian administracyjnych.

## Role
- `admin` - pełny dostęp i zarządzanie konfiguracją.
- `director` - szeroki wgląd i część operacji administracyjnych.
- `leader` - praca operacyjna w swoim zakresie.
- `assessor` - tworzenie i edycja kart w swoim zakresie.
- `viewer` - `Specjalista`, tylko własne oceny i własny zakres odczytu.

## Zasada zakresu
- `leaderScope` jest kluczem do filtrowania większości widoków zespołu.
- Konto `viewer` widzi karty przypisane do własnego `full_name` lub `email` w profilu, nie cały zakres lidera.
- UI może ukrywać funkcje, ale backend musi je egzekwować przez RLS albo funkcje serwerowe.
- Wersja `viewer` nie jest rolą "demo"; to normalne konto specjalisty z własnym dostępem.
- Flaga `is_active = false` ma odcinać dostęp po stronie backendu i traktujemy ją jak twardą blokadę konta.

## Operacje
- logowanie i odczyt profilu,
- tworzenie / zapis szkicu,
- zapis karty oceny,
- zmiana statusu,
- odczyt ewidencji i analityki,
- eksport,
- zarządzanie słownikami i użytkownikami,
- audyt zmian.

## Reguły biznesowe
- Walidacja danych ma działać po stronie backendu.
- Role i zakresy nie mogą być tylko ukryciem w interfejsie.
- Zapis zmieniający dane musi zostawiać historię.
- Baza stampuje `created_by`, `leader_scope` i `updated_at` dla kart oceny.
- Zmiany administracyjne zapisują wpis w `admin_history`.
- Edycja cudzych kart wymaga wyraźnych uprawnień.
- Konto `viewer` widzi tylko własny zakres.

## Launch checklist
- role są spójne w UI, localProvider i Supabase,
- zapis i odczyt działają bez utraty danych,
- szkice przetrwają odświeżenie,
- szkice, komentarze i powiadomienia w trybie produkcyjnym są zapisywane w Supabase, nie w `localStorage`,
- RLS blokuje nieautoryzowany dostęp,
- eksport działa na realnych danych,
- audyt rejestruje zmiany w kluczowych operacjach,
- smoke test przechodzi przed udostępnieniem zespołowi.

## Następne kroki
1. Ujednolicić listę ról w helperach i funkcjach Edge.
2. Przejrzeć RLS pod kątem zgodności z tym dokumentem.
3. Rozdzielić zapis szkicu, zapis karty i akcje administracyjne na osobne przepływy.
4. Dodać testy integracyjne dla kluczowych operacji.

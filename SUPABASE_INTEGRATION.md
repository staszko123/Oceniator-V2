# Supabase integration runbook

Ten dokument opisuje uruchomienie rzeczywistych testów integracyjnych przeciwko stagingowemu lub testowemu projektowi Supabase.

## Co sprawdza suite

- logowanie admina,
- zapis karty i stampowanie `created_by`,
- widoczność kart dla `viewer` / `Specjalista`,
- widoczność kart dla `leader` w jego zakresie,
- blokadę zapisu do `admin_history` dla `viewer`,
- zapis `admin_history` przez administratora, gdy dostępny jest `service_role` do sprzątania danych.

## Wymagane zmienne środowiskowe

Minimalne:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_TEST_ADMIN_EMAIL`
- `SUPABASE_TEST_ADMIN_PASSWORD`

Opcjonalne, ale zalecane:

- `SUPABASE_TEST_VIEWER_EMAIL`
- `SUPABASE_TEST_VIEWER_PASSWORD`
- `SUPABASE_TEST_LEADER_EMAIL`
- `SUPABASE_TEST_LEADER_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`

Jeśli nie podasz osobnych danych `viewer` i `leader`, suite utworzy tymczasowe konta tylko wtedy, gdy dostępny jest `SUPABASE_SERVICE_ROLE_KEY`.

## Uruchomienie

```powershell
npm run test:integration
```

Jeżeli brakuje wymaganych sekretów, suite zostanie pominięty zamiast blokować lokalny workflow.

## Kolejność przygotowania środowiska

1. Wgraj schemat:
   - `supabase/schema.sql`
2. Wgraj hardening:
   - `supabase/rls_hardening.sql`
3. Wdróż funkcję admina:
   - `supabase/functions/admin-users/index.ts`
4. Upewnij się, że konta testowe istnieją i mają oczekiwane role.
5. Uruchom testy:
   - `npm run test:integration`

## Sprzątanie danych

Jeśli testy zostawiły dane demo lub stagingowe, użyj:

- `supabase/delete_demo_cards.sql`

Jeżeli chcesz podnieść konto admina w środowisku lokalnym lub testowym:

- `supabase/set_jakub_admin.sql`
- `supabase/fix_profile_role_update.sql`

## Typowe problemy

- `401 Unauthorized` - brak aktywnej sesji albo błędne dane logowania.
- `403 Admin role required` - konto testowe nie ma roli `admin`.
- Pusta lista dla `viewer` - `spec` w karcie nie zgadza się z `full_name` lub `email` w profilu.
- Pusta lista dla `leader` - `leader_scope` nie zgadza się z zakresem lidera.
- Suite pominięty - brakuje sekretów lub test nie ma dostępu do stagingu.

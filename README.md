# Oceniator v2

Oceniator v2 to aplikacja React + Vite + TypeScript do oceny jakosci obslugi w kanalach
rozmow, maili i dzialan systemowych. Glowne UI jest teraz uruchamiane z rootowego
`index.html`, a poprzednia aplikacja statyczna zostala zachowana w `legacy/` jako fallback
referencyjny.

## Uruchomienie lokalne

```powershell
npm install
npm run dev
```

Nastepnie otworz adres pokazany przez Vite, domyslnie:

```text
http://127.0.0.1:5173/
```

## Build i weryfikacja

```powershell
npm run build
npm run lint
```

Rootowe skrypty buduja i sprawdzaja aplikacje React. Poprzedni wariant legacy nie jest juz
glownym entrypointem produkcyjnym.

## Tryby danych

- Domyslnie aplikacja probuje uzyc Supabase przez `app/src/data/supabaseProvider.ts`.
- Przycisk `Uruchom lokalne demo jako admin` przelacza przegladarke na provider lokalny.
- Dane lokalne v2 uzywaja kluczy `oc_v2_*` i nie mieszaja sie z legacy `localStorage`.

Konta demo:

- `admin / admin123`
- `lider01 / lider123`
- `lider02 / lider123`
- `lider / lider123`
- `oceniajacy / ocena123`
- `podglad / podglad123`

## Supabase

Schemat bazy i skrypty pomocnicze sa w katalogu `supabase/`:

- `schema.sql` - bazowy schemat tabel.
- `rls_hardening.sql` - polityki RLS i funkcje pomocnicze.
- `fix_profile_role_update.sql` - RPC do bezpiecznej aktualizacji profili.
- `functions/admin-users/` - Edge Function do tworzenia kont Auth z panelu admina.

Konfiguracja klienta React jest w `app/src/data/supabaseProvider.ts` i moze byc nadpisana
zmiennymi `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` oraz `VITE_SUPABASE_ENABLED=false`.
Klucza `service_role` nie wolno dodawac do frontendu.

## Struktura

- `index.html` - rootowy entrypoint React/Vite.
- `app/src/App.tsx` - glowne widoki: login, start, formularz, ewidencja, dashboard, raporty, admin.
- `app/src/domain/` - typy, definicje formularzy i logika scoringu.
- `app/src/data/` - providery danych local/Supabase i seed demo.
- `legacy/` - poprzedni statyczny shell jako fallback referencyjny.
- `supabase/` - schemat, polityki i Edge Function.

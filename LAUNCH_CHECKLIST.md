# Launch checklist

## 1. Dane i dostep
- Sprawdz, czy role sa zgodne z kontraktem: `admin`, `director`, `leader`, `assessor`, `viewer`/`Specjalista`.
- Zweryfikuj, czy kazdy uzytkownik ma osobne konto.
- Potwierdz, ze `viewer` widzi tylko swoje oceny.

## 2. Audyt i eksporty
- Otworz `Administracje` i sprawdz `Ostatnie zmiany`.
- Zapisz konfiguracje panelu administratora i potwierdz, ze wpis trafia do audytu.
- Wyeksportuj raport z `Ewidencji` i sprawdz, czy naglowki oraz daty sa czytelne.

## 3. Stabilnosc danych
- Utworz szkic, odswiez strone i potwierdz, ze szkic wraca.
- Zapisz ocene, przejdz do ewidencji i sprawdz stan po odswiezeniu.
- Zweryfikuj, ze po zmianie roli i wylogowaniu dane nie znikaja.

## 4. Start zespolowy
- Przetestuj z 1-2 wspolpracownikami.
- Zapisz, gdzie sie zatrzymuja i co jest niejasne.
- Popraw tylko miejsca, ktore realnie blokuja prace.
- Szczegoly pilota i decyzje go/no-go sa w `PILOT_RUNBOOK.md`.

## 5. Check techniczny
- `npm run build`
- `npm run lint`
- `npm test -- --run`
- `npm run test:integration` - tylko gdy masz stagingowe sekrety Supabase
- `npm run smoke`

## 6. Gotowosc do publikacji
- Brak bledow przy logowaniu i zapisie.
- Brak rozjazdu rol i widocznosci danych.
- Czytelny audyt zmian administracyjnych.
- Czysty przebieg: start, ocena, ewidencja, raport, administracja.

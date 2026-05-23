# Smoke check React v2

## Uruchomienie

```powershell
npm run dev
```

Otworz adres Vite, domyslnie `http://127.0.0.1:5173/`.

## Sciezka krytyczna

1. Na ekranie logowania kliknij `Uruchom lokalne demo jako admin`.
2. Przejdz przez widoki `Start`, `Dashboard`, `Ewidencja`, `Raporty`, `Panel admina`.
3. W formularzu utworz nowa karte rozmowy:
   - wybierz specjaliste,
   - ustaw date,
   - uzupelnij przynajmniej jeden identyfikator kontaktu,
   - zmien kilka ocen,
   - zapisz karte.
4. Sprawdz, czy karta pojawia sie w `Ewidencji`.
5. Otworz podglad karty, edytuj karte i zmien status.
6. W `Ewidencji` sprawdz eksport CSV, Excel i JSON.
7. W `Raportach` sprawdz eksport CSV liderow i JSON kart.
8. Odswiez strone i sprawdz, czy lokalna sesja oraz dane nadal dzialaja.

## Role lokalne

1. Wyloguj sie i zaloguj jako `lider01 / lider123`.
2. Sprawdz, czy widzi tylko zakres `Alicja Wrona`.
3. Wyloguj sie i zaloguj jako `lider02 / lider123`.
4. Sprawdz, czy widzi tylko zakres `Mateusz Cieslak`.
5. Wyloguj sie i zaloguj jako `podglad / podglad123`.
6. Sprawdz, czy formularz i admin nie sa widoczne, a ewidencja pozwala tylko na podglad i eksport.

## Supabase

1. Zaloguj sie realnym uzytkownikiem Supabase.
2. Sprawdz odczyt profilu, kart, slownikow, celow i okresow.
3. Jako admin sprawdz zapis konfiguracji i tworzenie uzytkownika przez Edge Function.
4. Jako konto bez uprawnien admina sprawdz, czy brak dostepu nie blokuje calej aplikacji.

## Stabilnosc i bezpieczenstwo

1. Uruchom `npm run build`.
2. Uruchom `npm run lint`.
3. Sprawdz desktop min. 1280 px.
4. Sprawdz maly viewport: aplikacja powinna pokazac komunikat o wymaganym wiekszym ekranie.
5. Wpisz w nazwach/notatkach tekst `<img src=x onerror=alert(1)>` i sprawdz, ze renderuje sie jako tekst bez wykonania JS.

# Oceniator — audyt portalu i pierwszy etap przebudowy

Data: 2026-10-09. Zakres: PC, widoki 1280×720, 1366×768, 1600×900 i 1920×1080. Telefon poza zakresem.

## Wnioski
Portal ma działający fundament ocen, ról i raportowania. Największą przeszkodą w codziennej pracy jest nadmiar powtarzających się informacji i akcji, duża wysokość nagłówków oraz niespójna organizacja filtrów. Przebudowę warto prowadzić etapami z zachowaniem obecnych zasad obliczania ocen.

## Potwierdzone obserwacje i priorytety
| Priorytet | Obszar | Obserwacja | Działanie |
|---|---|---|---|
| P1 | Start | Duży nagłówek i powielone skróty spychają zadania niżej; szkice są schowane | Kompaktowy nagłówek, dwie główne akcje, szkice dostępne od razu |
| P1 | Układ PC | Minimalna szerokość body 1280 powoduje przewijanie poziome po pojawieniu się pionowego paska | Elastyczna kolumna treści, przewijanie wyłącznie wewnątrz szerokich tabel |
| P1 | Ewidencja | Wyszukiwanie istnieje w filtrach i ponownie w tabeli; eksport także występuje w kilku miejscach | Jedna wyszukiwarka, jeden zestaw filtrów i jedno menu eksportu z jawnym zakresem danych |
| P1 | Formularz | Długi arkusz, powtarzane instrukcje, wiele równorzędnych kontrolek | Nawigacja po sekcjach, krótsze instrukcje, widoczny wynik i braki do zapisu |
| P2 | Słownictwo | Mieszanka polskiego i angielskiego (np. review), brak polskich znaków w części etykiet | Ujednolicić statusy i język całego procesu |
| P2 | CSS | Duży index.css z kolejnymi nadpisaniami i konfliktującymi breakpointami | Stopniowo przenosić style do komponentów; obecny portal.css jest etapem przejściowym |
| P2 | Wskaźniki | Start używa sztywnego progu avgFinal < 82 | Potwierdzić jedną definicję standardu i używać jej we wszystkich ekranach |

## Pierwsza zmiana w kodzie
- Neutralne powierzchnie, łagodniejsze obramowania i cienie, czytelniejsza typografia.
- Stały pasek boczny, zwijanie nawigacji, kompaktowy nagłówek i link klawiaturowy do treści.
- Krótszy ekran startowy, trzy wskaźniki w jednym rzędzie, widoczne szkice, usunięte powtórzenia głównych akcji.
- Formularz w dwóch kolumnach z panelem wyniku, którego zawartość można przewijać na niskim ekranie.
- Usunięcie technicznej plakietki dostawcy z głównego nagłówka.
- Zachowane istniejące reguły ocen, model danych i uprawnienia. Próg 82 nie został zmieniony.

## Weryfikacja
- TypeScript: PASS.
- Build Vite: PASS.
- ESLint: PASS.
- Testy Vitest w trybie threads, maxWorkers=2: 117 zaliczonych, 5 pominiętych (integracja wymagająca osobnego środowiska).
- Pierwsza próba w trybie forks: timeout startu jednego procesu w Windows; powtórzenie w threads zakończyło się poprawnie.
- Static smoke: PASS; git diff --check: PASS.
- Start w czterech rozdzielczościach: brak poziomego przewijania dokumentu. Dolna krawędź sekcji szkiców: ok. 642 px na 1280/1366, 678 px na 1600/1920.
- Formularz 1280×720: brak poziomego przewijania dokumentu; panel wyniku mieści się do ok. 715 px po ograniczeniu wysokości.
- Podgląd zmian używa lokalnych danych demonstracyjnych. Wcześniej osobno sprawdzono produkcyjne logowanie, odczyt ocen i zapis/odtworzenie szkicu. Nie wykonano pełnego zapisu nowej oceny w produkcji.
- Szczegółowy audyt wizualny Analityki, Raportów, Administracji i wszystkich ról pozostaje do kolejnego etapu. Ten raport nie jest pełnym audytem bezpieczeństwa.

## Kolejność dalszych prac
1. Uprościć Ewidencję i szczegóły oceny: jedna wyszukiwarka, zwięzłe filtry, jedno menu eksportu, jednoznaczny status i następny krok.
2. Skrócić formularz i przejść cały proces: szkic → wysłanie → decyzja → widok specjalisty. Sprawdzić oddzielnie każdą rolę.
3. Uporządkować Analitykę i Raporty wokół pytań użytkownika oraz wspólnego okresu raportowania.
4. Zakończyć porządkowanie CSS, języka i stanów pustych/błędów.

## Warunki przed szerszym udostępnieniem
Wcześniejszy przegląd ujawnił hasło administratora zapisane w skrypcie SQL w repozytorium — wymaga rotacji i usunięcia z historii. Wymagają też osobnej weryfikacji polityki dostępu specjalisty do ocen, kontrola roli w admin_update_profile i uprawnienia funkcji bazodanowych. Nie są naprawione w zmianie interfejsu.

## Projekt i publikacja
Repozytorium lokalne: C:\Users\Jakubst\Documents\Codex\Oceniator.
Gałąź: codex/portal-ux-foundation. Zmiana przeznaczona do przeglądu w PR; nie została scalona z main ani ręcznie opublikowana na produkcji.
Folder projektu został utworzony. Dodanie go do zapisanych projektów aplikacji Codex wymaga opcji Dodaj projekt i wskazania tego folderu; dostępne narzędzia nie udostępniają operacji rejestracji projektu.


## Aktualizacja — spójny styl i drugi etap, 2026-10-09

Wprowadzono wspólne powierzchnie, obramowania, typografię, pola, przyciski i tabele w widokach PC, również na logowaniu i w oknach szczegółów. Skrócono nagłówki zespołu, Analityki i Raportów. Liczniki oraz filtry analityczne wykorzystują szerokość ekranu PC.

Ewidencja ma jedną wyszukiwarkę i jedno menu eksportu CSV/Excel/JSON z podaną liczbą wszystkich wyników po filtrach. Usunięto powtórzone kontrolki tabeli, zachowując sortowanie i stronicowanie. Dodano jawne etykiety dostępności dla filtrów i test zachowania stronicowania po wyłączeniu wewnętrznej wyszukiwarki.

Zweryfikowano lokalnie: 118 testów zaliczonych, 5 integracyjnych pominiętych; TypeScript, build, lint i smoke poprawne. Przegląd wizualny głównych widoków administratora przy 1280×720; kontrola szerokości dokumentu bez przewijania poziomego. To weryfikacja UI na danych demo, bez zmian ocen produkcyjnych. Pełny proces biznesowy wszystkich ról pozostaje osobnym zadaniem.

README zastąpiono bieżącym opisem funkcji, zakresu PC, uruchamiania, testów, wdrożeń, struktury i ograniczeń. Publikację na produkcji autoryzował użytkownik; wcześniejsza informacja o pozostawieniu etapu pierwszego wyłącznie w PR dotyczyła stanu przed tą aktualizacją.

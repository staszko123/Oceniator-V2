# Oceniator — audyt i przebudowa portalu

Stan: 2026-10-09. Zakres produktu: PC 1280×720–1920×1080; telefon poza zakresem. Poprzedni ekran logowania został zachowany.

## Zrealizowane zmiany

| Obszar | Wynik |
|---|---|
| Wspólny interfejs | Spójne powierzchnie, typografia, przyciski, filtry, tabele i okna szczegółów; jasny i ciemny motyw. |
| Start | Krótki nagłówek, widoczne szkice i skróty zgodne z rolą. Dyrektor nie dostaje formularza ocen, oceniający nie dostaje niedostępnych skrótów do raportów. |
| Ewidencja | Jedna wyszukiwarka i menu eksportu wszystkich wyników po filtrach. Kolejka decyzji domyślnie zwinięta; usunięte powtórzone liczniki i przyciski zmiany statusu pod tabelą. |
| Szczegóły oceny | Przyciski nazywają następny krok; otwarte szczegóły odświeżają się po decyzji. Escape, obsługa fokusu i etykieta zamknięcia. |
| Formularz | Cztery sekcje: dane, kontakty, kryteria z uwagami, podsumowanie. Nawigacja po sekcjach, klikalna lista braków, mniej powtórzeń. |
| Zapis | Kolejka zapisów szkiców zapobiega nadpisaniu nowej wersji starszą odpowiedzią. Stan potwierdza odpowiedź bazy, błędy umożliwiają ponowienie. Blokada podwójnego wysłania i stały identyfikator szkicu; niepowodzenie powiadomienia nie udaje błędu zapisanej oceny. |
| Analityka i Raporty | Wspólny filtr zachowany przy przełączaniu widoków. Usunięte podwójne kafle raportu. Różnica do celu używa celu zespołu, także dla wartości 0; eksport ma jawny zakres. |
| Wyniki | Jedna definicja progów: standard 82%, bardzo dobry 92%. Klasyfikacja ekranów i eksportów wynika z wyniku liczbowego, także przy niespójnej etykiecie importowanej karty. Cel zespołu jest osobną wartością konfiguracyjną. |

## Role i proces

| Rola | Oceny | Decyzje | Administracja |
|---|---|---|---|
| Administrator | Wszystkie, tworzenie i edycja | Weryfikacja, zatwierdzenie, archiwum, przywrócenie | Konta, powiązania specjalistów, konfiguracja |
| Dyrektor | Odczyt wszystkich | Bez zmiany statusu | Cele i specjaliści; konta tylko do odczytu |
| Lider | Tworzenie i edycja we własnym zakresie | We własnym zakresie | Brak |
| Oceniający | Tworzenie i edycja we własnym zakresie | Brak | Brak |
| Specjalista | Odczyt własnych zatwierdzonych ocen i komentarzy | Brak | Brak |

Interfejs dyrektora dopasowano do istniejącego prawa odczytu ocen w bazie. Uprawnienia kont pozostają wyłącznie po stronie administratora. Zapis konfiguracji dyrektora pomija niedostępne słowniki i okresy.

Proces operacyjny: nowa ocena → do weryfikacji → w weryfikacji → zatwierdzona → archiwum. Przywrócenie z archiwum wraca do weryfikacji. Baza pilnuje decyzji administratora/lidera oraz niezmiennego autora i zakresu. Administrator może importować historyczne karty z zachowaniem statusu. Aktualizacja istniejącej oceny używa UPDATE, nowej INSERT; nie używa UPSERT uruchamiającego przedwcześnie trigger nowej oceny.

## Dostęp w Supabase

Przygotowano przyrostowy, powtarzalny skrypt `supabase/portal_access_completion.sql` i test transakcyjny `supabase/tests/portal_access_rollback.sql`. Nie należy ponownie uruchamiać całego katalogu SQL ani historycznego hardeningu na istniejącej bazie.

- Kontrola administratora odrzuca brak profilu i nieaktywne konto; odebrano anonimowe/PUBLIC wykonanie uprzywilejowanych RPC.
- Specjalista nie uzyskuje dostępu przez wspólny zakres lidera ani nazwisko oceniającego.
- Nazwa wyświetlana z rejestracji nie nadaje dostępu. Powiązanie z nazwanym specjalistą ustawia administrator w Administracja → Użytkownicy → Powiązany specjalista. UUID lub potwierdzony e-mail konta nadal mogą identyfikować zatwierdzoną kartę. Niepotwierdzony e-mail nie nadaje dostępu.
- Zapis pól konta i powiązania odbywa się w jednej transakcji; błędne powiązanie nie zapisuje części zmian.
- Istniejących kont nie połączono automatycznie po nazwisku. Przed nadaniem powiązania należy sprawdzić tożsamość; historyczne karty o jednakowych nazwiskach wymagają weryfikacji. Docelowo model powinien używać identyfikatora specjalisty zamiast nazwy.

## Weryfikacja tego etapu

- TypeScript, build Vite, ESLint, static smoke i git diff --check.
- Vitest: 125 zaliczonych, 5 integracyjnych pominiętych; pominięte testy wymagają oddzielnego środowiska i nie są dowodem poprawności produkcji.
- Niezależny przegląd granic uprawnień przed poprawką oraz przegląd kandydata po zmianie.
- Odtworzono pierwotny błąd RPC na syntetycznym koncie w transakcji z ROLLBACK. Kandydat odrzucił ten sam przypadek.
- Test SQL na rzeczywistym silniku: anonimowy/brak profilu/nieaktywny administrator/pozostałe role, wiarygodne powiązanie, odmowa samodzielnego powiązania, atomowy zapis konta, widoczność ocen i komentarzy, oceniający → lider → specjalista, odmowa zapisu obcego zakresu. Wszystkie dane testowe wycofano.
- Przegląd lokalnego UI dla pięciu ról. Pełny scenariusz demo: szkic → odświeżenie i odtworzenie → wysłanie → weryfikacja → zatwierdzenie → odczyt w portalu specjalisty.
- Potwierdzono zachowanie okresu między Raportami i Analityką. Kontrola bieżących widoków przy efektywnym obszarze 1280×720: bez przewijania poziomego dokumentu. Narzędzie zmiany viewportu w tej sesji pozostawało przy szerokości 1280; nie traktujemy prób ustawienia innych rozdzielczości jako nowych zaliczonych testów. Poprzedni etap fundamentu sprawdzono w czterech rozdzielczościach PC.
- Nie tworzono ani nie zatwierdzano ocen biznesowych w produkcji. Testy silnika bazy wycofano, a testy UI wykonywano na danych demo.

## Otwarte warunki szerszego udostępnienia

1. **Rotacja ujawnionego hasła administratora i usunięcie go z historii Git.** Skrypt zawierający hasło usunięto z bieżącej wersji i dodano reguły ignorowania podobnych plików. To nie unieważnia hasła ani jego kopii w historii. Zmianę hasła musi wykonać właściciel konta; historii nie przepisywano siłowo.
2. Zweryfikowane przypisania rzeczywistych kont specjalistów, szczególnie dla historycznych nazwisk.
3. Przeniesienie starszych stylów do komponentów, domknięcie pozostałych starych etykiet i migracja identyfikacji specjalistów z nazw na ID. Są to dalsze prace utrzymaniowe; ten etap nie jest pełnym skanem bezpieczeństwa repozytorium.

## Publikacja

Kod jest publikowany z GitHub `main` przez integrację Vercel. Zmiany bazy wymagają osobnego zastosowania przyrostowego skryptu; sam deploy frontendu ich nie uruchamia. Wynik wdrożenia i adres produkcyjny należy sprawdzić po scaleniu.

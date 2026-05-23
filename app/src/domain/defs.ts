import type { AssessmentDef, AssessmentType } from './types'

export const ASSESSMENT_DEFS: Record<AssessmentType, AssessmentDef> = {
  r: {
    name: 'Ocena Rozmow',
    contactLabel: 'Rozmowa',
    pluralLabel: 'rozmow',
    sections: [
      {
        key: 'mery',
        label: 'I. Merytoryka',
        weight: 0.45,
        criteria: [
          { name: 'Weryfikacja klienta', hint: 'Poprawna identyfikacja klienta przed udzieleniem informacji.' },
          { name: 'Znajomosc procedur i poprawnosc merytoryczna', hint: 'Informacje zgodne z baza wiedzy i aktualnymi procedurami.' },
          { name: 'Rozpoznanie potrzeb klienta', hint: 'Specjalista ustala powod kontaktu i nie zmusza klienta do powtarzania sprawy.' },
          { name: 'Empatia i nastawienie na klienta', hint: 'Adekwatna reakcja na emocje i jasne zaopiekowanie sprawy.' },
          { name: 'Rozwiazanie sprawy i FTR', hint: 'Kontakt prowadzi do kompletnego rozwiazania lub jasnego dalszego kroku.' },
          { name: 'Samodzielnosc i dzialania uzgodnione z klientem', hint: 'Dzialania sa adekwatne, bez zbednych konsultacji.' },
          { name: 'Edukacja i usamodzielnienie klienta', hint: 'Klient dostaje wiedze potrzebna do samodzielnego dzialania.' },
        ],
      },
      {
        key: 'jak',
        label: 'II. Jakosc / Komunikacja',
        weight: 0.45,
        criteria: [
          { name: 'Struktura rozmowy', hint: 'Powitanie, przedstawienie, podsumowanie i pozegnanie sa uporzadkowane.' },
          { name: 'Ton, tempo i atmosfera rozmowy', hint: 'Profesjonalny ton i tempo dopasowane do rozmowcy.' },
          { name: 'Poprawnosc i zrozumialosc jezykowa', hint: 'Komunikaty sa proste, uprzejme i bez zargonu.' },
          { name: 'Aktywne sluchanie', hint: 'Specjalista reaguje na wypowiedzi klienta i zadaje pytania doprecyzowujace.' },
          { name: 'Prowadzenie rozmowy i zarzadzanie cisza', hint: 'Klient wie, co dzieje sie w trakcie obslugi.' },
          { name: 'Jezyk korzysci i pozytywna narracja', hint: 'Komunikacja skupia sie na dostepnych rozwiazaniach.' },
          { name: 'Edukacja klienta', hint: 'Specjalista pokazuje opcje i dalsze mozliwosci obslugi.' },
        ],
      },
      {
        key: 'sys',
        label: 'III. Dzialania w systemach',
        weight: 0.1,
        criteria: [
          { name: 'Poprawne uzupelnienie skryptu w Altarze', hint: 'Status, typ problemu i opis sprawy sa kompletne.' },
          { name: 'Czas ACW', hint: 'Dzialania po rozmowie sa zasadne i zgodne ze standardem.' },
        ],
      },
    ],
  },
  m: {
    name: 'Ocena Maili',
    contactLabel: 'Mail',
    pluralLabel: 'maili',
    sections: [
      {
        key: 'mery',
        label: 'I. Merytoryka',
        weight: 0.45,
        criteria: [
          { name: 'Weryfikacja klienta', hint: 'Poprawna identyfikacja nadawcy zgodnie z procedura.' },
          { name: 'Poprawnosc merytoryczna odpowiedzi', hint: 'Odpowiedz jest zgodna z baza wiedzy i wytycznymi.' },
          { name: 'Rozpoznanie potrzeb i celu kontaktu', hint: 'Odpowiedz odnosi sie do wszystkich pytan klienta.' },
          { name: 'Rozwiazanie sprawy i FTR', hint: 'Odpowiedz domyka sprawe lub jasno okresla dalszy krok.' },
          { name: 'Edukacja klienta', hint: 'Klient dostaje instrukcje pozwalajace uniknac ponownego kontaktu.' },
        ],
      },
      {
        key: 'jak',
        label: 'II. Jakosc / Komunikacja',
        weight: 0.45,
        criteria: [
          { name: 'Powitanie i zakonczenie', hint: 'Forma powitania i pozegnania jest zgodna ze standardem.' },
          { name: 'Profesjonalizm i struktura wiadomosci', hint: 'Tresc jest logiczna, zwiezla i poprawnie sformatowana.' },
          { name: 'Poprawnosc jezykowa', hint: 'Brak bledow i negatywnych sformulowan.' },
          { name: 'Jasnosc przekazu', hint: 'Najwazniejsze informacje sa latwe do znalezienia.' },
          { name: 'Inicjatywa i postawa pro-kliencka', hint: 'Specjalista proponuje najlepsze rozwiazanie.' },
        ],
      },
      {
        key: 'sys',
        label: 'III. Dzialania w systemach',
        weight: 0.1,
        criteria: [
          { name: 'Poprawne uzupelnienie systemow', hint: 'Historia i pola obowiazkowe sa kompletne.' },
          { name: 'Efektywny czas obslugi maila', hint: 'Czas obslugi jest zgodny ze standardem.' },
        ],
      },
    ],
  },
  s: {
    name: 'Ocena Dzialan w Systemach',
    contactLabel: 'Kontakt',
    pluralLabel: 'kontaktow',
    sections: [
      {
        key: 'obs',
        label: 'I. Obsluga w systemach',
        weight: 0.5,
        criteria: [
          { name: 'Poprawne uzupelnienie skryptu w Altarze', hint: 'Status FTR, typ problemu i historia sa prawidlowe.' },
          { name: 'Poprawne uzupelnienie pozostalych systemow', hint: 'Brak pominietych pol w obslugiwanych systemach.' },
        ],
      },
      {
        key: 'dok',
        label: 'II. Dokumentacja zgloszenia',
        weight: 0.3,
        criteria: [
          { name: 'Poprawny zapis zgloszenia', hint: 'Temat, tresc, dzial, usluga i dane sa kompletne.' },
          { name: 'Prawidlowe przekazanie sprawy', hint: 'Eskalacja trafia do wlasciwego dzialu z pelnym opisem.' },
        ],
      },
      {
        key: 'eff',
        label: 'III. Efektywnosc',
        weight: 0.2,
        criteria: [
          { name: 'Efektywny czas obslugi', hint: 'Czas pracy w systemach jest zasadny.' },
          { name: 'Samodzielnosc specjalisty', hint: 'Sprawy standardowe sa obsluzone bez zbednych konsultacji.' },
        ],
      },
    ],
  },
}

export const TYPE_LABELS: Record<AssessmentType, string> = {
  r: 'Rozmowy',
  m: 'Maile',
  s: 'Systemy',
}

export const SCORE_OPTIONS = [
  { label: '1', value: 1 as const, title: 'Spelniony' },
  { label: '1/2', value: 0.5 as const, title: 'Czesciowo' },
  { label: '0', value: 0 as const, title: 'Niespelniony' },
  { label: 'N/D', value: 'nd' as const, title: 'Nie dotyczy' },
]

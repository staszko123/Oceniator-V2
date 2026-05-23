import { ASSESSMENT_DEFS } from '../domain/defs'
import { calcContact, periodOf, ratingForScore } from '../domain/scoring'
import type { AdminConfig, Assessment, AssessmentType, Goal, ScoreValue, Specialist } from '../domain/types'

const departments = [
  {
    name: 'Dzial Obslugi Klienta PeP',
    positions: ['Specjalista ds. Obslugi Klienta', 'Starszy Specjalista ds. Obslugi Klienta'],
    leaders: ['Alicja Wrona', 'Mateusz Cieslak', 'Ewa Sobczak'],
  },
  {
    name: 'Dzial Rozliczen P24',
    positions: ['Specjalista ds. Rozliczen', 'Starszy Specjalista ds. Rozliczen'],
    leaders: ['Rafal Kubiak', 'Joanna Malinowska', 'Pawel Michalski'],
  },
  {
    name: 'Dzial Wsparcia Technicznego',
    positions: ['Specjalista ds. Wsparcia Technicznego', 'Starszy Specjalista ds. Systemow'],
    leaders: ['Magdalena Baran', 'Tomasz Krol', 'Katarzyna Wojcik'],
  },
]

const firstNames = ['Anna', 'Piotr', 'Marta', 'Tomasz', 'Karolina', 'Michal', 'Natalia', 'Bartosz', 'Monika', 'Kamil']
const lastNames = ['Kowalska', 'Wisniewski', 'Dabrowska', 'Zajac', 'Lewandowski', 'Kowalczyk', 'Szymanska', 'Nowak']

const defaultGoals: Goal = {
  callsPerPeriod: 9,
  mailsPerPeriod: 9,
  systemsPerPeriod: 9,
  minAvg: 92,
  greatShare: 60,
}
export function buildDemoAdmin(): AdminConfig {
  const specialists: Specialist[] = []
  let index = 1
  departments.forEach((department, departmentIndex) => {
    department.leaders.forEach((leader, leaderIndex) => {
      for (let personIndex = 0; personIndex < 5; personIndex += 1) {
        const name = `${firstNames[(departmentIndex * 3 + leaderIndex + personIndex) % firstNames.length]} ${lastNames[(departmentIndex * 5 + leaderIndex * 2 + personIndex) % lastNames.length]}`
        specialists.push({
          id: String(index),
          name: specialists.some((person) => person.name === name) ? `${name} ${index}` : name,
          leader,
          department: department.name,
          position: department.positions[personIndex % department.positions.length],
          active: true,
        })
        index += 1
      }
    })
  })

  return {
    specialists,
    departments: departments.map((department) => department.name),
    positions: [...new Set(departments.flatMap((department) => department.positions))],
    leaders: departments.flatMap((department) => department.leaders),
    periods: [
      { code: 'P1', name: 'P1', from: '01-01', to: '04-30' },
      { code: 'P2', name: 'P2', from: '05-01', to: '08-31' },
      { code: 'P3', name: 'P3', from: '09-01', to: '12-31' },
    ],
    goals: defaultGoals,
  }
}

function seededScore(seed: number): ScoreValue {
  const value = (Math.sin(seed) + 1) / 2
  if (value > 0.78) return 1
  if (value > 0.48) return 0.5
  if (value > 0.16) return 0
  return 'nd'
}

export function buildDemoAssessments(admin: AdminConfig): Assessment[] {
  const dates = ['2026-01-16', '2026-02-24', '2026-03-19', '2026-05-04', '2026-05-17']
  const typeCycle: AssessmentType[] = ['r', 'm', 's', 'r', 'm']
  const assessments: Assessment[] = []

  admin.specialists.slice(0, 36).forEach((person, personIndex) => {
    dates.forEach((date, cardIndex) => {
      const type = typeCycle[cardIndex]
      const contactCount = type === 'r' ? 3 : 2
      const scores = Object.fromEntries(
        ASSESSMENT_DEFS[type].sections.map((section, sectionIndex) => [
          section.key,
          section.criteria.map((_, criterionIndex) => (
            Array.from({ length: contactCount }, (_value, contactIndex) => (
              seededScore((personIndex + 3) * (cardIndex + 5) * (sectionIndex + 7) * (criterionIndex + 2) * (contactIndex + 1))
            ))
          )),
        ]),
      )
      const notes = Object.fromEntries(
        ASSESSMENT_DEFS[type].sections.map((section) => [
          section.key,
          Array.from({ length: contactCount }, () => ''),
        ]),
      )
      const contactResults = Array.from({ length: contactCount }, (_, contactIndex) => calcContact(type, scores, contactIndex))
      const avgFinal = Math.round(contactResults.reduce((acc, result) => acc + result.pct, 0) / contactResults.length)
      const secAvg = Object.fromEntries(
        ASSESSMENT_DEFS[type].sections.map((section) => {
          const values = contactResults.map((result) => result.parts[section.key])
          return [section.key, Math.round(values.reduce((acc, value) => acc + value, 0) / values.length)]
        }),
      )

      assessments.push({
        id: crypto.randomUUID(),
        type,
        spec: person.name,
        stand: person.position,
        dzial: person.department,
        oce: person.leader,
        data: date,
        period: periodOf(date),
        avgFinal,
        secAvg,
        contactResults,
        rating: ratingForScore(avgFinal),
        notes: cardIndex % 2 ? 'Do omowienia na spotkaniu 1:1.' : 'Widoczna poprawa jakosci w ostatnim okresie.',
        contactCount,
        ids: Array.from({ length: contactCount }, (_, index) => `${type.toUpperCase()}-${date.replaceAll('-', '')}-${personIndex + 1}-${index + 1}`),
        snapshotScores: scores,
        snapshotNotes: notes,
        gold: Array.from({ length: contactCount }, () => 0),
        goldDesc: '',
        status: cardIndex % 4 === 0 ? 'review' : cardIndex % 5 === 0 ? 'approved' : 'submitted',
        statusHistory: [
          {
            status: cardIndex % 4 === 0 ? 'review' : cardIndex % 5 === 0 ? 'approved' : 'submitted',
            at: `${date}T09:00:00.000Z`,
            by: person.leader,
            note: 'Utworzono kartÄ™ bazowÄ…',
          },
        ],
        createdAt: `${date}T09:00:00.000Z`,
        leaderScope: person.leader,
      })
    })
  })

  return assessments.sort((a, b) => b.data.localeCompare(a.data))
}

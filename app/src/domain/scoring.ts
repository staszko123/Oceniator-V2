import { ASSESSMENT_DEFS } from './defs'
import type {
  Assessment,
  AssessmentDraft,
  AssessmentType,
  ContactResult,
  Rating,
  ScoreValue,
  ScoresMatrix,
} from './types'

export function ratingForScore(score: number): Rating {
  if (score >= 92) return 'great'
  if (score >= 82) return 'good'
  return 'below'
}

export function ratingLabel(rating: Rating): string {
  if (rating === 'great') return 'Bardzo dobry'
  if (rating === 'good') return 'Dobry'
  if (rating === 'below') return 'Ponizej standardu'
  return 'Brak'
}

export function periodOf(dateValue: string): string {
  if (!dateValue) return ''
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  const month = date.getMonth() + 1
  const code = month <= 4 ? 'P1' : month <= 8 ? 'P2' : 'P3'
  return `${code} ${date.getFullYear()}`
}

export function emptyScores(type: AssessmentType, contactCount: number): ScoresMatrix {
  const def = ASSESSMENT_DEFS[type]
  return Object.fromEntries(
    def.sections.map((section) => [
      section.key,
      section.criteria.map(() => Array.from({ length: contactCount }, () => 1 as ScoreValue)),
    ]),
  )
}

export function emptyNotes(type: AssessmentType, contactCount: number): Record<string, string[]> {
  return Object.fromEntries(
    ASSESSMENT_DEFS[type].sections.map((section) => [
      section.key,
      Array.from({ length: contactCount }, () => ''),
    ]),
  )
}

export function createDraft(type: AssessmentType): AssessmentDraft {
  const contactCount = type === 'r' ? 3 : 2
  const today = new Date().toISOString().slice(0, 10)
  return {
    type,
    contactCount,
    specialist: '',
    position: '',
    department: '',
    assessor: '',
    date: today,
    period: periodOf(today),
    contactIds: Array.from({ length: contactCount }, () => ''),
    scores: emptyScores(type, contactCount),
    notes: emptyNotes(type, contactCount),
    gold: Array.from({ length: contactCount }, () => 0),
    goldDescription: '',
    summary: '',
  }
}

export function resizeDraft(draft: AssessmentDraft, contactCount: number): AssessmentDraft {
  const next = Math.max(1, Math.min(6, contactCount))
  const scores = emptyScores(draft.type, next)
  const notes = emptyNotes(draft.type, next)

  ASSESSMENT_DEFS[draft.type].sections.forEach((section) => {
    section.criteria.forEach((_, criterionIndex) => {
      for (let contactIndex = 0; contactIndex < next; contactIndex += 1) {
        scores[section.key][criterionIndex][contactIndex] =
          draft.scores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
      }
    })
    for (let contactIndex = 0; contactIndex < next; contactIndex += 1) {
      notes[section.key][contactIndex] = draft.notes[section.key]?.[contactIndex] ?? ''
    }
  })

  return {
    ...draft,
    contactCount: next,
    contactIds: Array.from({ length: next }, (_, index) => draft.contactIds[index] ?? ''),
    scores,
    notes,
    gold: Array.from({ length: next }, (_, index) => draft.gold[index] ?? 0),
  }
}

export function calcContact(type: AssessmentType, scores: ScoresMatrix, contactIndex: number): ContactResult {
  const def = ASSESSMENT_DEFS[type]
  let total = 0
  const parts: Record<string, number> = {}
  const pts = { sum: 0, max: 0 }

  def.sections.forEach((section) => {
    const values = section.criteria.map((_, criterionIndex) => (
      scores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
    ))
    const valid = values.filter((value) => value !== 'nd') as number[]
    const max = valid.length
    const sum = valid.reduce((acc, value) => acc + value, 0)
    const ratio = max > 0 ? sum / max : 1
    total += ratio * section.weight
    parts[section.key] = Math.round(ratio * 100)
    pts.sum = Number((pts.sum + sum).toFixed(1))
    pts.max += max
  })

  return { pct: Math.round(total * 100), parts, pts }
}

export function calculateDraft(draft: AssessmentDraft): {
  results: ContactResult[]
  avgFinal: number
  secAvg: Record<string, number>
  rating: Rating
} {
  const results = Array.from({ length: draft.contactCount }, (_, contactIndex) => {
    const result = calcContact(draft.type, draft.scores, contactIndex)
    const bonus = draft.gold[contactIndex] ?? 0
    return {
      ...result,
      pct: bonus > 0 && result.pct < 100 ? Math.min(100, result.pct + bonus * 10) : result.pct,
    }
  })

  const avgFinal = results.length
    ? Math.round(results.reduce((acc, result) => acc + result.pct, 0) / results.length)
    : 0

  const secAvg = Object.fromEntries(
    ASSESSMENT_DEFS[draft.type].sections.map((section) => {
      const values = results.map((result) => result.parts[section.key] ?? 100)
      return [section.key, values.length ? Math.round(values.reduce((acc, value) => acc + value, 0) / values.length) : 0]
    }),
  )

  return { results, avgFinal, secAvg, rating: ratingForScore(avgFinal) }
}

export function draftToAssessment(draft: AssessmentDraft, leaderScope: string): Assessment {
  const calculated = calculateDraft(draft)
  return {
    id: draft.id ?? crypto.randomUUID(),
    type: draft.type,
    spec: draft.specialist,
    stand: draft.position,
    dzial: draft.department,
    oce: draft.assessor,
    data: draft.date,
    period: draft.period || periodOf(draft.date),
    avgFinal: calculated.avgFinal,
    secAvg: calculated.secAvg,
    contactResults: calculated.results,
    rating: calculated.rating,
    notes: draft.summary,
    contactCount: draft.contactCount,
    ids: draft.contactIds,
    snapshotScores: draft.scores,
    snapshotNotes: draft.notes,
    gold: draft.gold,
    goldDesc: draft.goldDescription,
    status: 'submitted',
    statusHistory: [{ status: 'submitted', at: new Date().toISOString(), by: draft.assessor, note: 'Utworzono karte' }],
    createdAt: new Date().toISOString(),
    leaderScope,
  }
}

export function assessmentToDraft(assessment: Assessment): AssessmentDraft {
  return {
    id: assessment.id,
    type: assessment.type,
    contactCount: assessment.contactCount,
    specialist: assessment.spec,
    position: assessment.stand,
    department: assessment.dzial,
    assessor: assessment.oce,
    date: assessment.data,
    period: assessment.period || periodOf(assessment.data),
    contactIds: assessment.ids,
    scores: assessment.snapshotScores,
    notes: assessment.snapshotNotes,
    gold: assessment.gold,
    goldDescription: assessment.goldDesc,
    summary: assessment.notes,
    savedAt: assessment.createdAt,
  }
}

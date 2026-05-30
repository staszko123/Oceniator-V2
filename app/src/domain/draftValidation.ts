import { ASSESSMENT_DEFS } from './defs'
import type { AssessmentDraft, AssessmentType, ScoreValue } from './types'

export interface DraftValidationIssue {
  key: string
  label: string
}

export interface DraftValidationResult {
  valid: boolean
  issues: DraftValidationIssue[]
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

function hasSectionNote(draft: AssessmentDraft): boolean {
  return Object.values(draft.notes || {}).some((items) => items.some((item) => hasText(item)))
}

function hasLoweredScore(draft: AssessmentDraft): boolean {
  return Object.values(draft.scores || {}).some((rows) =>
    rows.some((row) => row.some((value) => value === 0 || value === 0.5)),
  )
}

function hasValidScoreShape(type: AssessmentType, draft: AssessmentDraft): boolean {
  const def = ASSESSMENT_DEFS[type]
  if (!def || draft.contactCount < 1 || draft.contactCount > 6) return false

  return def.sections.every((section) => {
    const rows = draft.scores?.[section.key]
    if (!Array.isArray(rows) || rows.length !== section.criteria.length) return false
    return rows.every((row) =>
      Array.isArray(row)
      && row.length === draft.contactCount
      && row.every((value): value is ScoreValue => value === 1 || value === 0.5 || value === 0 || value === 'nd'),
    )
  })
}

export function validateAssessmentDraft(draft: AssessmentDraft): DraftValidationResult {
  const issues: DraftValidationIssue[] = []

  if (!hasText(draft.specialist)) {
    issues.push({ key: 'specialist', label: 'Wybierz specjalistę.' })
  }
  if (!hasText(draft.date)) {
    issues.push({ key: 'date', label: 'Uzupełnij datę oceny.' })
  }
  if (!hasText(draft.position)) {
    issues.push({ key: 'position', label: 'Brakuje stanowiska specjalisty.' })
  }
  if (!hasText(draft.department)) {
    issues.push({ key: 'department', label: 'Brakuje działu specjalisty.' })
  }
  if (!draft.contactIds.some((item) => hasText(item))) {
    issues.push({ key: 'contactIds', label: 'Dodaj przynajmniej jeden identyfikator kontaktu lub sprawy.' })
  }
  if (!hasValidScoreShape(draft.type, draft)) {
    issues.push({ key: 'scores', label: 'Scoring ma nieprawidłową strukturę dla tego typu oceny.' })
  }
  if (!hasText(draft.summary)) {
    issues.push({ key: 'summary', label: 'Uzupełnij podsumowanie końcowe.' })
  }
  if (hasLoweredScore(draft) && !hasSectionNote(draft)) {
    issues.push({ key: 'notes', label: 'Dodaj notatkę uzasadniającą obniżoną ocenę.' })
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

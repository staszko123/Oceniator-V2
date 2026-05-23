import { ASSESSMENT_DEFS } from '../../domain/defs'
import { calculateDraft, ratingLabel } from '../../domain/scoring'
import type { AssessmentDraft } from '../../domain/types'

export type DraftAssistantResult = {
  status: 'ok' | 'warning'
  title: string
  summary: string
  warnings: string[]
  suggestions: string[]
}

function cleanSectionLabel(label: string): string {
  return label.replace(/^[IVX]+\.\s*/, '').trim()
}

export function reviewDraftQuality(draft: AssessmentDraft): DraftAssistantResult {
  const def = ASSESSMENT_DEFS[draft.type]
  const warnings: string[] = []
  const suggestions: string[] = []
  const filledIds = draft.contactIds.filter((item) => item.trim())
  const noteCount = def.sections.reduce((total, section) => (
    total + (draft.notes[section.key] || []).filter((item) => item.trim()).length
  ), 0)
  const lowScores = def.sections.reduce((total, section) => (
    total + section.criteria.reduce((sectionTotal, _criterion, criterionIndex) => (
      sectionTotal + (draft.scores[section.key]?.[criterionIndex] || []).filter((value) => value === 0 || value === 0.5).length
    ), 0)
  ), 0)
  const hasGold = draft.gold.some((value) => Number(value) > 0)
  const finalScore = calculateDraft(draft).avgFinal

  if (!draft.specialist.trim()) warnings.push('Brakuje wybranego specjalisty.')
  if (!draft.date) warnings.push('Brakuje daty oceny.')
  if (!filledIds.length) warnings.push('Uzupelnij przynajmniej jeden identyfikator kontaktu.')
  if (filledIds.length && filledIds.length < draft.contactCount) {
    suggestions.push('Nie wszystkie pola kontaktow sa uzupelnione. Sprawdz, czy liczba kontaktow zgadza sie z karta.')
  }
  if (lowScores > 0 && noteCount === 0 && !draft.summary.trim()) {
    warnings.push('W karcie sa obnizone oceny, ale brakuje komentarzy sekcyjnych lub podsumowania.')
  }
  if (hasGold && !draft.goldDescription.trim()) {
    warnings.push('Dodano zlote punkty bez opisu sytuacji.')
  }
  if (finalScore >= 92 && !draft.summary.trim()) {
    suggestions.push('Przy bardzo dobrym wyniku warto dodac krotkie podsumowanie, zeby karta byla czytelna w ewidencji.')
  }

  return {
    status: warnings.length ? 'warning' : 'ok',
    title: 'Kontrola jakosci karty',
    summary: warnings.length
      ? `Wykryto ${warnings.length} ryzyk przed zapisem.`
      : 'Karta nie ma widocznych ryzyk przed zapisem.',
    warnings,
    suggestions,
  }
}

export function buildDraftSummary(draft: AssessmentDraft): string {
  const def = ASSESSMENT_DEFS[draft.type]
  const calculated = calculateDraft(draft)
  const parts = def.sections.map((section) => {
    const score = calculated.secAvg[section.key] || 0
    const notes = (draft.notes[section.key] || []).filter((item) => item.trim()).join(' ')
    const intro = score >= 92
      ? `${cleanSectionLabel(section.label)} jest na wysokim poziomie.`
      : score >= 82
        ? `${cleanSectionLabel(section.label)} jest na dobrym poziomie, ale widac miejsce na doszlifowanie.`
        : `${cleanSectionLabel(section.label)} wymaga poprawy i doprecyzowania dalszych dzialan.`
    return `${intro} Wynik sekcji: ${score}%.${notes ? ` Uwagi: ${notes}` : ''}`
  })
  parts.push(`Wynik koncowy wynosi ${calculated.avgFinal}%. Ocena: ${ratingLabel(calculated.rating)}.`)
  return parts.join('\n\n')
}

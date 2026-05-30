import { describe, expect, it } from 'vitest'
import { createDraft } from './scoring'
import { validateAssessmentDraft } from './draftValidation'

describe('draft validation', () => {
  it('blocks saving an incomplete draft', () => {
    const result = validateAssessmentDraft(createDraft('r'))

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.key)).toContain('specialist')
    expect(result.issues.map((issue) => issue.key)).toContain('contactIds')
    expect(result.issues.map((issue) => issue.key)).toContain('summary')
  })

  it('allows a complete draft with required fields', () => {
    const draft = createDraft('r')
    draft.specialist = 'Anna Kowalska'
    draft.position = 'Specjalista'
    draft.department = 'Obsługa'
    draft.assessor = 'Lider'
    draft.contactIds[0] = 'CALL-1'
    draft.summary = 'Rozmowa spełnia wymagania jakościowe.'

    expect(validateAssessmentDraft(draft).valid).toBe(true)
  })

  it('requires a section note when a score is lowered', () => {
    const draft = createDraft('r')
    draft.specialist = 'Anna Kowalska'
    draft.position = 'Specjalista'
    draft.department = 'Obsługa'
    draft.assessor = 'Lider'
    draft.contactIds[0] = 'CALL-1'
    draft.summary = 'Wynik wymaga omówienia.'
    draft.scores.mery[0][0] = 0.5

    expect(validateAssessmentDraft(draft).issues.map((issue) => issue.key)).toContain('notes')

    draft.notes.mery[0] = 'Niepełna diagnoza potrzeby.'
    expect(validateAssessmentDraft(draft).valid).toBe(true)
  })
})

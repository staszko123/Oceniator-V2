import { describe, expect, it } from 'vitest'
import { PROVIDER_LABELS, ROLE_LABELS, SCORE_GOOD_THRESHOLD, SCORE_GREAT_THRESHOLD, scoreClass } from './display'

describe('display helpers', () => {
  it('keeps score thresholds mapped to the expected classes', () => {
    expect(scoreClass(SCORE_GREAT_THRESHOLD)).toBe('score score-great')
    expect(scoreClass(SCORE_GOOD_THRESHOLD)).toBe('score score-good')
    expect(scoreClass(SCORE_GOOD_THRESHOLD - 1)).toBe('score score-below')
  })

  it('exposes user-facing role and provider labels without mojibake', () => {
    expect(ROLE_LABELS.assessor).toBe('Oceniający')
    expect(ROLE_LABELS.viewer).toBe('Specjalista')
    expect(PROVIDER_LABELS.local).toBe('Demo lokalne')
    expect(PROVIDER_LABELS.supabase).toBe('Supabase')
  })
})

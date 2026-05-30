import { describe, expect, it, vi } from 'vitest'
import {
  calculateDraft,
  createDraft,
  draftHasContent,
  draftToAssessment,
  periodOf,
  ratingForScore,
  resizeDraft,
} from './scoring'

describe('scoring helpers', () => {
  it('derives reporting periods from dates', () => {
    expect(periodOf('2026-01-12')).toBe('P1 2026')
    expect(periodOf('2026-06-12')).toBe('P2 2026')
    expect(periodOf('2026-10-12')).toBe('P3 2026')
    expect(periodOf('')).toBe('')
    expect(periodOf('bad-date')).toBe('')
  })

  it('detects meaningful draft content', () => {
    const emptyDraft = createDraft('r')
    expect(draftHasContent(emptyDraft)).toBe(false)

    const populatedDraft = {
      ...emptyDraft,
      specialist: 'Jan Kowalski',
    }
    expect(draftHasContent(populatedDraft)).toBe(true)
  })

  it('resizes drafts without losing entered values', () => {
    const draft = createDraft('r')
    draft.contactIds[0] = 'CALL-1'
    draft.gold[0] = 1
    draft.notes.mery[0] = 'Pierwsza notatka'
    draft.scores.mery[0][0] = 0

    const grown = resizeDraft(draft, 5)
    expect(grown.contactCount).toBe(5)
    expect(grown.contactIds[0]).toBe('CALL-1')
    expect(grown.gold[0]).toBe(1)
    expect(grown.notes.mery[0]).toBe('Pierwsza notatka')
    expect(grown.scores.mery[0][0]).toBe(0)

    const shrunk = resizeDraft(grown, 1)
    expect(shrunk.contactCount).toBe(1)
    expect(shrunk.contactIds).toEqual(['CALL-1'])
    expect(shrunk.gold).toEqual([1])
  })

  it('calculates averages, section summaries and bonuses', () => {
    const draft = createDraft('r')
    draft.gold = [1, 0, 0]
    draft.scores.mery[0][0] = 0
    draft.scores.mery[0][1] = 0.5
    draft.scores.mery[0][2] = 'nd'

    const result = calculateDraft(draft)

    expect(result.results).toHaveLength(3)
    expect(result.results[0].pct).toBeLessThanOrEqual(100)
    expect(result.avgFinal).toBeGreaterThan(0)
    expect(Object.keys(result.secAvg)).toContain('mery')
    expect(result.rating).toBe(ratingForScore(result.avgFinal))
  })

  it('converts a draft into an assessment with initial history', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T08:30:00.000Z'))

    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111')
    const draft = {
      ...createDraft('m'),
      specialist: 'Anna Nowak',
      position: 'Specjalista',
      department: 'Reklamacje',
      assessor: 'Lider QA',
      summary: 'Podsumowanie oceny',
    }

    const assessment = draftToAssessment(draft, 'Lider QA')

    expect(assessment.id).toBe('11111111-1111-4111-8111-111111111111')
    expect(assessment.status).toBe('submitted')
    expect(assessment.statusHistory).toEqual([
      {
        status: 'submitted',
        at: '2026-05-29T08:30:00.000Z',
        by: 'Lider QA',
        note: 'Utworzono karte',
      },
    ])
    expect(assessment.leaderScope).toBe('Lider QA')
    expect(assessment.notes).toBe('Podsumowanie oceny')

    uuidSpy.mockRestore()
    vi.useRealTimers()
  })
})

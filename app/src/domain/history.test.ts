import { describe, expect, it } from 'vitest'
import type { Assessment } from './types'
import { hasEditHistory, lastHistoryAt, lastHistoryBy, lastHistoryNote, lastStatusEvent, shortDateTime } from './history'

function makeAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'assessment-1',
    type: 'r',
    spec: 'Jan Kowalski',
    stand: 'Specjalista',
    dzial: 'Sprzedaz',
    oce: 'Anna Lider',
    data: '2026-05-29',
    period: 'P2 2026',
    avgFinal: 90,
    secAvg: { standard: 90 },
    contactResults: [],
    rating: 'good',
    notes: '',
    contactCount: 1,
    ids: ['CALL-1'],
    snapshotScores: { standard: [[1]] },
    snapshotNotes: { standard: [''] },
    gold: [0],
    goldDesc: '',
    status: 'submitted',
    statusHistory: [
      { status: 'submitted', at: '2026-05-29T08:30:00.000Z', by: 'Anna Lider', note: 'Utworzono karte' },
      { status: 'review', at: '2026-05-30T08:30:00.000Z', by: 'Lider', note: 'Edytowano karte przez lidera' },
    ],
    createdAt: '2026-05-29T08:30:00.000Z',
    leaderScope: 'Anna Lider',
    ...overrides,
  }
}

describe('history helpers', () => {
  it('returns the last history event and derived fields', () => {
    const assessment = makeAssessment()
    expect(lastStatusEvent(assessment)?.status).toBe('review')
    expect(lastHistoryAt(assessment)).toBe('2026-05-30T08:30:00.000Z')
    expect(lastHistoryBy(assessment)).toBe('Lider')
    expect(lastHistoryNote(assessment)).toBe('Edytowano karte przez lidera')
  })

  it('detects edit history markers', () => {
    expect(hasEditHistory(makeAssessment())).toBe(true)
    expect(hasEditHistory(makeAssessment({ statusHistory: [{ status: 'submitted', at: '2026-05-29T08:30:00.000Z', by: 'Anna Lider', note: 'Utworzono karte' }] }))).toBe(false)
  })

  it('formats short date time safely', () => {
    expect(shortDateTime('')).toBe('-')
    expect(shortDateTime('2026-05-30T08:30:00.000Z')).toContain('30.05')
    expect(shortDateTime('not-a-date')).toBe('not-a-date')
  })
})

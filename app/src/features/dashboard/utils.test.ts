import { describe, expect, it } from 'vitest'
import type { Assessment } from '../../domain/types'
import { dashboardLeaderRanking, dashboardTrend, sectionBreakdown, weakestCriteria } from './utils'

function createAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'assessment-1',
    type: 'r',
    spec: 'Jan Kowalski',
    stand: 'Specjalista',
    dzial: 'QA',
    oce: 'Lider operacyjny',
    data: '2026-05-30',
    period: 'P5 2026',
    avgFinal: 88,
    secAvg: {},
    contactResults: [],
    rating: 'good',
    notes: '',
    contactCount: 1,
    ids: ['contact-1'],
    snapshotScores: {},
    snapshotNotes: {},
    gold: [],
    goldDesc: '',
    status: 'approved',
    statusHistory: [],
    createdAt: '2026-05-30T08:00:00.000Z',
    leaderScope: '',
    ...overrides,
  }
}

describe('dashboard utils', () => {
  it('returns empty aggregates for empty dashboard inputs', () => {
    expect(sectionBreakdown([])).toEqual([])
    expect(weakestCriteria([])).toEqual([])
    expect(dashboardTrend([])).toEqual([])
    expect(dashboardLeaderRanking([])).toEqual([])
  })

  it('falls back to evaluator or default leader label when ranking leaders', () => {
    const rows = [
      createAssessment({ id: 'assessment-1', avgFinal: 91, oce: 'Lider A', leaderScope: '' }),
      createAssessment({ id: 'assessment-2', avgFinal: 84, oce: 'Lider A', leaderScope: '' }),
      createAssessment({ id: 'assessment-3', avgFinal: 79, oce: '', leaderScope: '' }),
    ]

    expect(dashboardLeaderRanking(rows)).toEqual([
      { leader: 'Lider A', count: 2, avg: 88, below: 0, review: 0 },
      { leader: 'Brak lidera', count: 1, avg: 79, below: 0, review: 0 },
    ])
  })
})

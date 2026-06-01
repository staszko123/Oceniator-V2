import { describe, expect, it } from 'vitest'
import type { Assessment } from '../../domain/types'
import {
  averageScore,
  criterionAverage,
  sectionAverage,
  sortAssessmentsDesc,
  sortPeriodsAsc,
} from './viewerMetrics'

function createAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'assessment-1',
    type: 'r',
    spec: 'Jan Kowalski',
    stand: 'Specjalista',
    dzial: 'Operacje',
    oce: 'Lider 1',
    data: '2026-05-20',
    period: 'P2 2026',
    avgFinal: 88,
    secAvg: {},
    contactResults: [{ pct: 88, pts: { sum: 22, max: 25 }, parts: { mery: 75, jak: 100, sys: 100 } }],
    rating: 'good',
    notes: '',
    contactCount: 1,
    ids: ['CALL-1'],
    snapshotScores: {
      mery: [[1, 'nd', 0.5]],
      jak: [[1]],
      sys: [[1]],
    },
    snapshotNotes: {},
    gold: [],
    goldDesc: '',
    status: 'approved',
    statusHistory: [],
    createdAt: '2026-05-20T10:00:00.000Z',
    leaderScope: 'Lider 1',
    ...overrides,
  }
}

describe('viewerMetrics', () => {
  it('returns null for empty summary rows', () => {
    expect(averageScore([])).toBeNull()
  })

  it('sorts periods ascending and removes blanks/duplicates', () => {
    expect(sortPeriodsAsc(['P2 2026', '', 'P1 2026', 'P2 2026'])).toEqual(['P1 2026', 'P2 2026'])
  })

  it('sorts assessments from newest to oldest', () => {
    const older = createAssessment({ id: 'older', data: '2026-05-18', createdAt: '2026-05-18T09:00:00.000Z' })
    const newer = createAssessment({ id: 'newer', data: '2026-05-20', createdAt: '2026-05-20T08:00:00.000Z' })

    expect(sortAssessmentsDesc([older, newer]).map((item) => item.id)).toEqual(['newer', 'older'])
  })

  it('derives section and criterion averages from snapshot scores', () => {
    const assessment = createAssessment()

    expect(sectionAverage(assessment, 'mery')).toBe(75)
    expect(criterionAverage(assessment, 'mery', 0)).toBe(75)
  })

  it('returns null when a section has no recorded scores', () => {
    const assessment = createAssessment({
      snapshotScores: {
        mery: [['nd', 'nd']],
        jak: [[1]],
        sys: [[1]],
      },
    })

    expect(sectionAverage(assessment, 'mery')).toBeNull()
    expect(criterionAverage(assessment, 'mery', 0)).toBeNull()
  })
})

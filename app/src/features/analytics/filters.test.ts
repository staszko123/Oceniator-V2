import { describe, expect, it } from 'vitest'
import type { Assessment } from '../../domain/types'
import { applyAnalyticsFilters, defaultAnalyticsFilters, uniqueSorted } from './filters'

const assessments: Assessment[] = [
  {
    id: '1',
    type: 'r',
    spec: 'Anna',
    stand: 'Specjalista',
    dzial: 'Sprzedaz',
    oce: 'Lider A',
    data: '2026-05-01',
    period: '2026-05',
    avgFinal: 94,
    secAvg: {},
    contactResults: [],
    rating: 'great',
    notes: '',
    contactCount: 1,
    ids: ['R-1'],
    snapshotScores: {},
    snapshotNotes: {},
    gold: [],
    goldDesc: '',
    status: 'submitted',
    statusHistory: [],
    createdAt: '2026-05-01T08:00:00.000Z',
    leaderScope: 'Lider A',
  },
  {
    id: '2',
    type: 'm',
    spec: 'Bartek',
    stand: 'Specjalista',
    dzial: 'Sprzedaz',
    oce: 'Inny lider',
    data: '2026-05-03',
    period: '2026-05',
    avgFinal: 88,
    secAvg: {},
    contactResults: [],
    rating: 'good',
    notes: '',
    contactCount: 1,
    ids: ['M-1'],
    snapshotScores: {},
    snapshotNotes: {},
    gold: [],
    goldDesc: '',
    status: 'review',
    statusHistory: [],
    createdAt: '2026-05-03T08:00:00.000Z',
    leaderScope: 'Lider B',
  },
  {
    id: '3',
    type: 's',
    spec: 'Celina',
    stand: 'Specjalista',
    dzial: 'Backoffice',
    oce: 'Lider A',
    data: '2026-04-29',
    period: '2026-04',
    avgFinal: 72,
    secAvg: {},
    contactResults: [],
    rating: 'below',
    notes: '',
    contactCount: 1,
    ids: ['S-1'],
    snapshotScores: {},
    snapshotNotes: {},
    gold: [],
    goldDesc: '',
    status: 'archived',
    statusHistory: [],
    createdAt: '2026-04-29T08:00:00.000Z',
    leaderScope: 'Lider A',
  },
]

describe('analytics filters', () => {
  it('returns all filter values by default', () => {
    expect(defaultAnalyticsFilters()).toEqual({
      period: 'all',
      type: 'all',
      leader: 'all',
      specialist: 'all',
    })
  })

  it('keeps active rows when filters stay at the default empty state', () => {
    const filtered = applyAnalyticsFilters(assessments, defaultAnalyticsFilters())
    expect(filtered.map((item) => item.id)).toEqual(['1', '2'])
  })

  it('returns an empty result safely when there are no rows', () => {
    expect(applyAnalyticsFilters([], defaultAnalyticsFilters())).toEqual([])
  })

  it('matches leader filters against both evaluator and leader scope', () => {
    const filtered = applyAnalyticsFilters(assessments, {
      period: 'all',
      type: 'all',
      leader: 'Lider B',
      specialist: 'all',
    })

    expect(filtered.map((item) => item.id)).toEqual(['2'])
  })

  it('drops empty option values before sorting filter lists', () => {
    expect(uniqueSorted(['Zespol B', '', 'Zespol A', 'Zespol B'])).toEqual(['Zespol A', 'Zespol B'])
  })
})

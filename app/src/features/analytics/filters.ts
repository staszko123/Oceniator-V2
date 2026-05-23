import type { Assessment, AssessmentType } from '../../domain/types'

export type AnalyticsFilters = {
  period: string
  type: AssessmentType | 'all'
  leader: string
  specialist: string
}

export function defaultAnalyticsFilters(): AnalyticsFilters {
  return { period: 'all', type: 'all', leader: 'all', specialist: 'all' }
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pl'))
}

export function applyAnalyticsFilters(rows: Assessment[], filters: AnalyticsFilters): Assessment[] {
  return rows.filter((item) => (
    item.status !== 'archived'
    && (filters.period === 'all' || item.period === filters.period)
    && (filters.type === 'all' || item.type === filters.type)
    && (filters.leader === 'all' || item.oce === filters.leader || item.leaderScope === filters.leader)
    && (filters.specialist === 'all' || item.spec === filters.specialist)
  ))
}

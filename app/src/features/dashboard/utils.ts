import { ASSESSMENT_DEFS, TYPE_LABELS } from '../../domain/defs'
import type { Assessment } from '../../domain/types'

export type DashboardPanelKey = 'trend' | 'typeMix' | 'sections' | 'leaders' | 'weak' | 'lowScores'
export type DashboardDensity = 'comfortable' | 'compact'
export type DashboardLayout = 'grid' | 'focus'
export type DashboardPrefs = { order: DashboardPanelKey[]; hidden: DashboardPanelKey[]; density: DashboardDensity; layout: DashboardLayout }

export const dashboardPanelLabels: Record<DashboardPanelKey, string> = {
  trend: 'Trend okresowy',
  typeMix: 'Rozklad typow',
  sections: 'Sekcje jakosci',
  leaders: 'Ranking liderow',
  weak: 'Slabe kryteria',
  lowScores: 'Najpilniejsze karty',
}

export const defaultDashboardPanelOrder: DashboardPanelKey[] = ['trend', 'typeMix', 'sections', 'leaders', 'weak', 'lowScores']

export function readDashboardPrefs(): DashboardPrefs {
  const fallback: DashboardPrefs = { order: defaultDashboardPanelOrder, hidden: [], density: 'comfortable', layout: 'grid' }
  try {
    const parsed = JSON.parse(localStorage.getItem('oc_v2_dashboard_prefs') || 'null') as Partial<DashboardPrefs> | null
    if (!parsed) return fallback
    const order = (parsed.order || fallback.order).filter((item): item is DashboardPanelKey => defaultDashboardPanelOrder.includes(item as DashboardPanelKey))
    return {
      order: [...order, ...defaultDashboardPanelOrder.filter((item) => !order.includes(item))],
      hidden: (parsed.hidden || []).filter((item): item is DashboardPanelKey => defaultDashboardPanelOrder.includes(item as DashboardPanelKey)),
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      layout: parsed.layout === 'focus' ? 'focus' : 'grid',
    }
  } catch {
    return fallback
  }
}

export function writeDashboardPrefs(prefs: DashboardPrefs) {
  try {
    localStorage.setItem('oc_v2_dashboard_prefs', JSON.stringify(prefs))
  } catch {
    // UI preferences are optional.
  }
}

function sectionAverage(assessment: Assessment, sectionKey: string): number {
  if (assessment.secAvg[sectionKey]) return assessment.secAvg[sectionKey]
  const section = ASSESSMENT_DEFS[assessment.type].sections.find((item) => item.key === sectionKey)
  if (!section) return 0
  const values = section.criteria.flatMap((_, criterionIndex) => (
    assessment.snapshotScores[sectionKey]?.[criterionIndex] || []
  )).filter((value) => value !== 'nd') as number[]
  return values.length ? Math.round(values.reduce((acc, value) => acc + value, 0) / values.length * 100) : 100
}

export function sectionBreakdown(rows: Assessment[]) {
  const buckets = new Map<string, { label: string; sum: number; count: number }>()
  rows.forEach((assessment) => {
    ASSESSMENT_DEFS[assessment.type].sections.forEach((section) => {
      const key = `${assessment.type}-${section.key}`
      const current = buckets.get(key) || { label: `${TYPE_LABELS[assessment.type]} · ${section.label}`, sum: 0, count: 0 }
      current.sum += sectionAverage(assessment, section.key)
      current.count += 1
      buckets.set(key, current)
    })
  })
  return [...buckets.values()]
    .map((item) => ({ label: item.label, avg: item.count ? Math.round(item.sum / item.count) : 0, count: item.count }))
    .sort((a, b) => a.avg - b.avg)
}

export function weakestCriteria(rows: Assessment[]) {
  const buckets = new Map<string, { label: string; sum: number; count: number }>()
  rows.forEach((assessment) => {
    const def = ASSESSMENT_DEFS[assessment.type]
    def.sections.forEach((section) => {
      section.criteria.forEach((criterion, criterionIndex) => {
        const values = (assessment.snapshotScores[section.key]?.[criterionIndex] || []).filter((value) => value !== 'nd') as number[]
        if (!values.length) return
        const key = `${assessment.type}-${section.key}-${criterionIndex}`
        const current = buckets.get(key) || { label: `${TYPE_LABELS[assessment.type]} · ${criterion.name}`, sum: 0, count: 0 }
        current.sum += values.reduce((acc, value) => acc + value, 0)
        current.count += values.length
        buckets.set(key, current)
      })
    })
  })
  return [...buckets.values()]
    .map((item) => ({ label: item.label, avg: item.count ? Math.round(item.sum / item.count * 100) : 0, count: item.count }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 10)
}

function periodRank(period: string): number {
  const match = period.match(/P(\d)\s+(\d{4})/)
  if (!match) return 0
  return Number(match[2]) * 10 + Number(match[1])
}

export function dashboardTrend(rows: Assessment[]) {
  const buckets = new Map<string, { period: string; count: number; sum: number; below: number; review: number }>()
  rows.forEach((assessment) => {
    const period = assessment.period || 'Brak okresu'
    const current = buckets.get(period) || { period, count: 0, sum: 0, below: 0, review: 0 }
    current.count += 1
    current.sum += assessment.avgFinal
    if (assessment.rating === 'below') current.below += 1
    if (assessment.status === 'review' || assessment.status === 'submitted') current.review += 1
    buckets.set(period, current)
  })
  return [...buckets.values()]
    .map((item) => ({ ...item, avg: item.count ? Math.round(item.sum / item.count) : 0 }))
    .sort((a, b) => periodRank(a.period) - periodRank(b.period) || a.period.localeCompare(b.period, 'pl'))
}

export function dashboardLeaderRanking(rows: Assessment[]) {
  const buckets = new Map<string, Assessment[]>()
  rows.forEach((assessment) => {
    const leader = assessment.leaderScope || assessment.oce || 'Brak lidera'
    buckets.set(leader, [...(buckets.get(leader) || []), assessment])
  })
  return [...buckets.entries()]
    .map(([leader, leaderRows]) => ({
      leader,
      count: leaderRows.length,
      avg: leaderRows.length ? Math.round(leaderRows.reduce((acc, item) => acc + item.avgFinal, 0) / leaderRows.length) : 0,
      below: leaderRows.filter((item) => item.rating === 'below').length,
      review: leaderRows.filter((item) => item.status === 'review' || item.status === 'submitted').length,
    }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, 8)
}

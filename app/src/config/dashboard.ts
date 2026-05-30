import type { DashboardMetric } from '../types/dashboard'

export type DashboardPanelKey = 'trend' | 'typeMix' | 'sections' | 'leaders' | 'weak' | 'lowScores'
export type DashboardDensity = 'comfortable' | 'compact'
export type DashboardLayout = 'grid' | 'focus'

export interface DashboardPrefs {
  order: DashboardPanelKey[]
  hidden: DashboardPanelKey[]
  density: DashboardDensity
  layout: DashboardLayout
}

export interface DashboardPanelConfig {
  key: DashboardPanelKey
  labelKey: string
  subtitleKey: string
}

export const dashboardPanelConfig: Record<DashboardPanelKey, DashboardPanelConfig> = {
  trend: { key: 'trend', labelKey: 'dashboard.panel.trend.label', subtitleKey: 'dashboard.panel.trend.subtitle' },
  typeMix: { key: 'typeMix', labelKey: 'dashboard.panel.typeMix.label', subtitleKey: 'dashboard.panel.typeMix.subtitle' },
  sections: { key: 'sections', labelKey: 'dashboard.panel.sections.label', subtitleKey: 'dashboard.panel.sections.subtitle' },
  leaders: { key: 'leaders', labelKey: 'dashboard.panel.leaders.label', subtitleKey: 'dashboard.panel.leaders.subtitle' },
  weak: { key: 'weak', labelKey: 'dashboard.panel.weak.label', subtitleKey: 'dashboard.panel.weak.subtitle' },
  lowScores: { key: 'lowScores', labelKey: 'dashboard.panel.lowScores.label', subtitleKey: 'dashboard.panel.lowScores.subtitle' },
}

export const defaultDashboardPanelOrder: DashboardPanelKey[] = ['trend', 'typeMix', 'sections', 'leaders', 'weak', 'lowScores']

export const defaultDashboardPrefs: DashboardPrefs = {
  order: defaultDashboardPanelOrder,
  hidden: [],
  density: 'comfortable',
  layout: 'grid',
}

export function normalizeDashboardPrefs(prefs?: Partial<DashboardPrefs> | null): DashboardPrefs {
  if (!prefs) return defaultDashboardPrefs
  const order = (prefs.order || defaultDashboardPrefs.order).filter((item) => defaultDashboardPanelOrder.includes(item))
  const hidden = (prefs.hidden || []).filter((item) => defaultDashboardPanelOrder.includes(item))

  return {
    order: [...order, ...defaultDashboardPanelOrder.filter((item) => !order.includes(item))],
    hidden,
    density: prefs.density === 'compact' ? 'compact' : 'comfortable',
    layout: prefs.layout === 'focus' ? 'focus' : 'grid',
  }
}

export function createDashboardMetric(key: string, label: string, value: string | number, hint?: string): DashboardMetric {
  return { key, label, value, hint }
}

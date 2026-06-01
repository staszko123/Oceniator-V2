import { describe, expect, it } from 'vitest'
import { dashboardPanelConfig, defaultDashboardPanelOrder, normalizeDashboardPrefs } from './dashboard'

describe('dashboard config', () => {
  it('exposes a stable panel order for the dashboard shell', () => {
    expect(defaultDashboardPanelOrder).toEqual(['trend', 'typeMix', 'sections', 'leaders', 'weak', 'lowScores'])
    expect(Object.keys(dashboardPanelConfig)).toEqual(defaultDashboardPanelOrder)
  })

  it('filters unknown panels and appends missing defaults in order', () => {
    expect(
      normalizeDashboardPrefs({
        order: ['weak', 'unknown-panel' as never, 'trend'],
        hidden: ['leaders', 'missing-panel' as never],
        density: 'compact',
        layout: 'focus',
      }),
    ).toEqual({
      order: ['weak', 'trend', 'typeMix', 'sections', 'leaders', 'lowScores'],
      hidden: ['leaders'],
      density: 'compact',
      layout: 'focus',
    })
  })
})

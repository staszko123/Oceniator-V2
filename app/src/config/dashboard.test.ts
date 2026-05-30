import { describe, expect, it } from 'vitest'
import { dashboardPanelConfig, defaultDashboardPanelOrder } from './dashboard'

describe('dashboard config', () => {
  it('exposes a stable panel order for the dashboard shell', () => {
    expect(defaultDashboardPanelOrder).toEqual(['trend', 'typeMix', 'sections', 'leaders', 'weak', 'lowScores'])
    expect(Object.keys(dashboardPanelConfig)).toEqual(defaultDashboardPanelOrder)
  })
})

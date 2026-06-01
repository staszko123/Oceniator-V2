import { describe, expect, it } from 'vitest'
import { userPreferenceKeys } from './userPreferences'

describe('user preferences config', () => {
  it('exposes stable persisted keys for shared shell preferences', () => {
    expect(userPreferenceKeys).toEqual({
      dashboardPrefs: 'dashboardPrefs',
      shellCollapsed: 'shellCollapsed',
    })
    expect(new Set(Object.values(userPreferenceKeys)).size).toBe(Object.keys(userPreferenceKeys).length)
  })
})

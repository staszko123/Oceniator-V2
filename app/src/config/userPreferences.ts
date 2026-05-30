export const userPreferenceKeys = {
  dashboardPrefs: 'dashboardPrefs',
  shellCollapsed: 'shellCollapsed',
} as const

export type UserPreferenceKey = typeof userPreferenceKeys[keyof typeof userPreferenceKeys]

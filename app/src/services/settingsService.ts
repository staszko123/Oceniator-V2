import type { DashboardPrefs } from '../config/dashboard'
import { defaultDashboardPanelOrder } from '../config/dashboard'
import type { Language } from '../types/language'
import { readStorageItem, readStorageJson, writeStorageJson, writeStorageItem } from '../utils/storage'

export type ProviderMode = 'local' | 'supabase'
export type ThemeMode = 'light' | 'dark'

const keys = {
  providerMode: 'oc_v2_provider',
  theme: 'oceniator-theme',
  language: 'oc_v2_language',
  shellCollapsed: 'oc_v2_shell_sidebar_collapsed',
  dashboardPrefs: 'oc_v2_dashboard_prefs',
}

const defaultDashboardPrefs: DashboardPrefs = {
  order: defaultDashboardPanelOrder,
  hidden: [],
  density: 'comfortable',
  layout: 'grid',
}

export function getProviderMode(): ProviderMode {
  return readStorageItem(keys.providerMode) === 'local' ? 'local' : 'supabase'
}

export function setProviderMode(mode: ProviderMode): void {
  writeStorageItem(keys.providerMode, mode)
}

export function getThemePreference(): ThemeMode {
  const stored = readStorageItem(keys.theme)
  return stored === 'light' || stored === 'dark' ? stored : 'light'
}

export function setThemePreference(theme: ThemeMode): void {
  writeStorageItem(keys.theme, theme)
}

export function getLanguagePreference(): Language {
  return readStorageItem(keys.language) === 'en' ? 'en' : 'pl'
}

export function setLanguagePreference(language: Language): void {
  writeStorageItem(keys.language, language)
}

export function getShellCollapsedPreference(): boolean {
  return readStorageItem(keys.shellCollapsed) === 'true'
}

export function setShellCollapsedPreference(collapsed: boolean): void {
  writeStorageItem(keys.shellCollapsed, String(collapsed))
}

export function getDashboardPreferences(): DashboardPrefs {
  const parsed = readStorageJson<Partial<DashboardPrefs> | null>(keys.dashboardPrefs, null)
  if (!parsed) return defaultDashboardPrefs
  const order = (parsed.order || defaultDashboardPrefs.order).filter((item) => defaultDashboardPanelOrder.includes(item))
  const hidden = (parsed.hidden || []).filter((item) => defaultDashboardPanelOrder.includes(item))

  return {
    order: [...order, ...defaultDashboardPanelOrder.filter((item) => !order.includes(item))],
    hidden,
    density: parsed.density === 'compact' ? 'compact' : 'comfortable',
    layout: parsed.layout === 'focus' ? 'focus' : 'grid',
  }
}

export function setDashboardPreferences(prefs: DashboardPrefs): void {
  writeStorageJson(keys.dashboardPrefs, prefs)
}


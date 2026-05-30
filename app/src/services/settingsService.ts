import type { Language } from '../types/language'
import { readStorageItem, writeStorageItem } from '../utils/storage'

export type ProviderMode = 'local' | 'supabase'
export type ThemeMode = 'light' | 'dark'

const keys = {
  providerMode: 'oc_v2_provider',
  theme: 'oceniator-theme',
  language: 'oc_v2_language',
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

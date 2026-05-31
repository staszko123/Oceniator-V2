import type { Language } from '../types/language'
import { readStorageItem, writeStorageItem } from '../utils/storage'

export type ProviderMode = 'local' | 'supabase'
export type ThemeMode = 'light' | 'dark'
export type AppEnvironment = 'local' | 'staging' | 'production'

const keys = {
  providerMode: 'oc_v2_provider',
  theme: 'oceniator-theme',
  language: 'oc_v2_language',
}

function normalizeEnvironment(value: string | undefined): AppEnvironment | null {
  if (value === 'local' || value === 'staging' || value === 'production') return value
  return null
}

function normalizeTheme(value: string | null): ThemeMode | null {
  if (value === 'light' || value === 'dark') return value
  return null
}

export function getAppEnvironment(): AppEnvironment {
  return normalizeEnvironment(import.meta.env.VITE_APP_ENV) || (import.meta.env.DEV ? 'local' : 'production')
}

export function isLocalDemoEnabled(): boolean {
  return getAppEnvironment() === 'local'
}

export function getProviderMode(): ProviderMode {
  if (isLocalDemoEnabled()) return 'local'
  return readStorageItem(keys.providerMode) === 'local' ? 'local' : 'supabase'
}

export function setProviderMode(mode: ProviderMode): void {
  if (isLocalDemoEnabled()) {
    writeStorageItem(keys.providerMode, 'local')
    return
  }
  writeStorageItem(keys.providerMode, mode)
}

export function getOAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''
  return url.toString()
}

export function getThemePreference(): ThemeMode {
  return normalizeTheme(readStorageItem(keys.theme)) || 'light'
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

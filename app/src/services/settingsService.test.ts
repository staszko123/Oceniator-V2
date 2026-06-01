import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAppEnvironment,
  getLanguagePreference,
  getOAuthRedirectUrl,
  getProviderMode,
  getThemePreference,
  setLanguagePreference,
  setProviderMode,
  setThemePreference,
} from './settingsService'

const originalWindow = globalThis.window

function createStorageMock(): Storage {
  const store = new Map<string, string>()

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

function installWindow(href = 'https://oceniator.test/app', storage?: Storage) {
  const fallbackStorage = originalWindow?.localStorage || createStorageMock()

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      location: new URL(href),
      localStorage: storage || fallbackStorage,
    },
  })
}

describe('settingsService', () => {
  beforeEach(() => {
    installWindow()
    window.localStorage.clear()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: originalWindow,
      })
      return
    }

    Reflect.deleteProperty(globalThis, 'window')
  })

  it('forces local provider mode in local environment', () => {
    vi.stubEnv('VITE_APP_ENV', 'local')
    window.localStorage.setItem('oc_v2_provider', 'supabase')

    expect(getProviderMode()).toBe('local')

    setProviderMode('supabase')
    expect(window.localStorage.getItem('oc_v2_provider')).toBe('local')
  })

  it('persists provider mode outside local environment', () => {
    vi.stubEnv('VITE_APP_ENV', 'production')

    expect(getProviderMode()).toBe('supabase')

    setProviderMode('local')
    expect(getProviderMode()).toBe('local')

    setProviderMode('supabase')
    expect(getProviderMode()).toBe('supabase')
  })

  it('falls back to the current runtime when VITE_APP_ENV is invalid', () => {
    vi.stubEnv('VITE_APP_ENV', 'preview-like')

    expect(getAppEnvironment()).toBe(import.meta.env.DEV ? 'local' : 'production')
  })

  it('reads and writes theme and language preferences with safe defaults', () => {
    expect(getThemePreference()).toBe('light')
    expect(getLanguagePreference()).toBe('pl')

    setThemePreference('dark')
    setLanguagePreference('en')

    expect(getThemePreference()).toBe('dark')
    expect(getLanguagePreference()).toBe('en')
  })

  it('builds OAuth redirect URL without hash or search params', () => {
    installWindow('https://oceniator.test/app?mode=google#registry?preset=recent', window.localStorage)

    expect(getOAuthRedirectUrl()).toBe('https://oceniator.test/app')
  })

  it('returns an empty OAuth redirect URL without window state', () => {
    Reflect.deleteProperty(globalThis, 'window')

    expect(getOAuthRedirectUrl()).toBe('')
  })
})

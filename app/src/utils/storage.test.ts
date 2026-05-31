import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canUsePersistentStorage,
  readStorageItem,
  readStorageJson,
  removeStorageItem,
  writeStorageItem,
  writeStorageJson,
} from './storage'

const originalWindow = globalThis.window

function installWindowWithStorage(storage: Storage) {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage },
    configurable: true,
    writable: true,
  })
}

describe('storage utils', () => {
  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      })
      return
    }

    Reflect.deleteProperty(globalThis, 'window')
  })

  it('falls back to in-memory storage when window is unavailable', () => {
    Reflect.deleteProperty(globalThis, 'window')

    expect(canUsePersistentStorage()).toBe(false)

    writeStorageItem('draft', 'value')
    expect(readStorageItem('draft')).toBe('value')

    writeStorageJson('prefs', { theme: 'dark' })
    expect(readStorageJson('prefs', { theme: 'light' })).toEqual({ theme: 'dark' })

    removeStorageItem('draft')
    expect(readStorageItem('draft')).toBeNull()
  })

  it('falls back to in-memory storage when localStorage throws', () => {
    const failingStorage = {
      getItem: vi.fn(() => {
        throw new Error('Quota exceeded')
      }),
      setItem: vi.fn(() => {
        throw new Error('Quota exceeded')
      }),
      removeItem: vi.fn(() => {
        throw new Error('Quota exceeded')
      }),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage

    installWindowWithStorage(failingStorage)

    writeStorageItem('draft', 'backup')
    expect(readStorageItem('draft')).toBe('backup')

    removeStorageItem('draft')
    expect(readStorageItem('draft')).toBeNull()
  })

  it('returns fallback json on malformed payloads', () => {
    const localStorage = {
      getItem: vi.fn(() => '{bad json'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage

    installWindowWithStorage(localStorage)

    expect(readStorageJson('prefs', { theme: 'light' })).toEqual({ theme: 'light' })
  })
})

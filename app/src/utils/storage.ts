const memoryStorage = new Map<string, string>()

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function canUsePersistentStorage(): boolean {
  return hasLocalStorage()
}

export function readStorageItem(key: string): string | null {
  if (!hasLocalStorage()) return memoryStorage.get(key) ?? null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memoryStorage.get(key) ?? null
  }
}

export function writeStorageItem(key: string, value: string): void {
  if (!hasLocalStorage()) {
    memoryStorage.set(key, value)
    return
  }
  try {
    window.localStorage.setItem(key, value)
  } catch {
    memoryStorage.set(key, value)
  }
}

export function removeStorageItem(key: string): void {
  if (!hasLocalStorage()) {
    memoryStorage.delete(key)
    return
  }
  try {
    window.localStorage.removeItem(key)
  } catch {
    memoryStorage.delete(key)
  }
}

export function readStorageJson<T>(key: string, fallback: T): T {
  const raw = readStorageItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStorageJson(key: string, value: unknown): void {
  writeStorageItem(key, JSON.stringify(value))
}

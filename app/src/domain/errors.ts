export type ErrorKind = 'validation' | 'auth' | 'forbidden' | 'network' | 'conflict' | 'storage' | 'unknown'

type ErrorContext = {
  kind: ErrorKind
  code?: string
  status?: number
  name?: string
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
    const errorMessageValue = (error as { error?: unknown }).error
    if (typeof errorMessageValue === 'string' && errorMessageValue.trim()) return errorMessageValue
  }
  return ''
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const message = errorMessage(error).trim()
  return message || fallback
}

export function getErrorKind(error: unknown): ErrorKind {
  const message = errorMessage(error).toLowerCase()
  if (!message) return 'unknown'
  if (message.includes('validation') || message.includes('nieprawidlow') || message.includes('invalid')) return 'validation'
  if (message.includes('unauthorized') || message.includes('nie masz dostepu') || message.includes('brak aktywnej sesji')) return 'auth'
  if (message.includes('forbidden') || message.includes('brak dostepu')) return 'forbidden'
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('failed to fetch')) return 'network'
  if (message.includes('conflict') || message.includes('already exists') || message.includes('juz istnieje')) return 'conflict'
  if (message.includes('storage') || message.includes('quota') || message.includes('localstorage') || message.includes('local storage')) return 'storage'
  return 'unknown'
}

export function isRetryableError(error: unknown): boolean {
  const kind = getErrorKind(error)
  return kind === 'network' || kind === 'storage'
}

export function getSafeErrorContext(error: unknown): ErrorContext {
  const kind = getErrorKind(error)
  if (!error || typeof error !== 'object') return { kind }

  const candidate = error as { code?: unknown; status?: unknown; name?: unknown }
  const context: ErrorContext = { kind }

  if (typeof candidate.code === 'string' && candidate.code.trim()) context.code = candidate.code
  if (typeof candidate.status === 'number' && Number.isFinite(candidate.status)) context.status = candidate.status
  if (typeof candidate.name === 'string' && candidate.name.trim()) context.name = candidate.name

  return context
}

import { describe, expect, it } from 'vitest'
import { getErrorKind, getErrorMessage, getSafeErrorContext, isRetryableError } from './errors'

describe('error helpers', () => {
  it('prefers concrete error messages', () => {
    expect(getErrorMessage(new Error('Brak dostepu'), 'fallback')).toBe('Brak dostepu')
    expect(getErrorMessage('  ', 'fallback')).toBe('fallback')
    expect(getErrorMessage({ error: 'Quota exceeded' }, 'fallback')).toBe('Quota exceeded')
  })

  it('classifies common error types', () => {
    expect(getErrorKind(new Error('Validation failed'))).toBe('validation')
    expect(getErrorKind(new Error('Unauthorized'))).toBe('auth')
    expect(getErrorKind(new Error('Forbidden'))).toBe('forbidden')
    expect(getErrorKind(new Error('Failed to fetch'))).toBe('network')
    expect(getErrorKind(new Error('Already exists'))).toBe('conflict')
    expect(getErrorKind(new Error('localStorage quota exceeded'))).toBe('storage')
    expect(getErrorKind({ error: 'Brak dostepu do raportu' })).toBe('forbidden')
    expect(getErrorKind('')).toBe('unknown')
  })

  it('marks network and storage errors as retryable', () => {
    expect(isRetryableError(new Error('Failed to fetch'))).toBe(true)
    expect(isRetryableError(new Error('Quota exceeded'))).toBe(true)
    expect(isRetryableError(new Error('Unauthorized'))).toBe(false)
  })

  it('returns sanitized diagnostic context without raw messages', () => {
    expect(getSafeErrorContext({ message: 'secret backend detail', code: '42501', status: 403, name: 'PostgrestError' })).toEqual({
      kind: 'unknown',
      code: '42501',
      status: 403,
      name: 'PostgrestError',
    })
    expect(getSafeErrorContext(new Error('Failed to fetch'))).toEqual({
      kind: 'network',
      name: 'Error',
    })
  })
})

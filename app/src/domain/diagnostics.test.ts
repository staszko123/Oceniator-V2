import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDiagnostics, loadDiagnostics, recordDiagnostic, scopeLabel } from './diagnostics'

describe('diagnostics helpers', () => {
  beforeEach(() => {
    clearDiagnostics()
  })

  it('records and loads events in newest-first order', () => {
    const uuidSpy = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-30T10:00:00.000Z'))

    recordDiagnostic({ scope: 'admin', action: 'save', detail: 'Konfiguracja', level: 'success' })
    vi.setSystemTime(new Date('2026-05-30T10:05:00.000Z'))
    recordDiagnostic({ scope: 'registry', action: 'export', detail: 'CSV', level: 'info' })

    const events = loadDiagnostics()
    expect(events).toHaveLength(2)
    expect(events[0].id).toBe('22222222-2222-4222-8222-222222222222')
    expect(events[0].scope).toBe('registry')
    expect(events[1].id).toBe('11111111-1111-4111-8111-111111111111')

    uuidSpy.mockRestore()
    vi.useRealTimers()
  })

  it('maps scopes to human-readable labels', () => {
    expect(scopeLabel('auth')).toBe('Logowanie')
    expect(scopeLabel('admin')).toBe('Administracja')
    expect(scopeLabel('reports')).toBe('Raporty')
  })

  it('keeps only the newest 120 events', () => {
    let sequence = 0
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      const suffix = String(sequence++).padStart(12, '0')
      return `00000000-0000-4000-8000-${suffix}`
    })

    for (let index = 0; index < 125; index += 1) {
      recordDiagnostic({
        scope: 'system',
        action: 'heartbeat',
        detail: `event-${index}`,
        level: 'info',
      })
    }

    const events = loadDiagnostics()
    expect(events).toHaveLength(120)
    expect(events[0]?.detail).toBe('event-124')
    expect(events.at(-1)?.detail).toBe('event-5')

    uuidSpy.mockRestore()
  })
})

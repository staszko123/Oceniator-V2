import type { AssessmentType } from './types'

export type DiagnosticLevel = 'info' | 'success' | 'warning' | 'error'

export interface DiagnosticEvent {
  id: string
  at: string
  scope: 'auth' | 'draft' | 'assessment' | 'admin' | 'registry' | 'reports' | 'system'
  action: string
  detail: string
  level: DiagnosticLevel
}

const key = 'oc_v2_diagnostics'
const maxEvents = 120
let memoryEvents: DiagnosticEvent[] = []

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

function readEvents(): DiagnosticEvent[] {
  if (!canUseStorage()) return memoryEvents
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as DiagnosticEvent[] : []
  } catch {
    return memoryEvents
  }
}

function writeEvents(events: DiagnosticEvent[]): void {
  if (!canUseStorage()) {
    memoryEvents = events.slice(0, maxEvents)
    return
  }
  localStorage.setItem(key, JSON.stringify(events.slice(0, maxEvents)))
}

export function loadDiagnostics(): DiagnosticEvent[] {
  return readEvents()
}

export function recordDiagnostic(event: Omit<DiagnosticEvent, 'id' | 'at'>): DiagnosticEvent {
  const next: DiagnosticEvent = {
    ...event,
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
  }
  const events = [next, ...readEvents()].slice(0, maxEvents)
  writeEvents(events)
  return next
}

export function clearDiagnostics(): void {
  if (!canUseStorage()) {
    memoryEvents = []
    return
  }
  localStorage.removeItem(key)
}

export function scopeLabel(scope: DiagnosticEvent['scope'] | AssessmentType): string {
  switch (scope) {
    case 'auth': return 'Logowanie'
    case 'draft': return 'Szkic'
    case 'assessment': return 'Ocena'
    case 'admin': return 'Administracja'
    case 'registry': return 'Ewidencja'
    case 'reports': return 'Raporty'
    case 'system': return 'System'
    default: return scope
  }
}

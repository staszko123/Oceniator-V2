import type { Assessment, StatusEvent } from './types'

export function lastStatusEvent(assessment: Assessment): StatusEvent | undefined {
  const history = assessment.statusHistory || []
  return history[history.length - 1]
}

export function lastHistoryAt(assessment: Assessment): string {
  return lastStatusEvent(assessment)?.at || ''
}

export function lastHistoryBy(assessment: Assessment): string {
  return lastStatusEvent(assessment)?.by || ''
}

export function lastHistoryNote(assessment: Assessment): string {
  return lastStatusEvent(assessment)?.note || ''
}

export function hasEditHistory(assessment: Assessment): boolean {
  return (assessment.statusHistory || []).some((item) => item.note.toLowerCase().includes('edytowano kart'))
}

export function shortDateTime(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

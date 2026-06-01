import { ASSESSMENT_DEFS } from '../../domain/defs'
import type { Assessment, ScoreValue } from '../../domain/types'

function periodRank(period: string): number {
  const match = period.match(/P(\d)\s+(\d{4})/)
  if (!match) return 0
  return Number(match[2]) * 10 + Number(match[1])
}

export function sortPeriodsAsc(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => (
    periodRank(left) - periodRank(right) || left.localeCompare(right, 'pl')
  ))
}

export function sortPeriodsDesc(values: string[]): string[] {
  return sortPeriodsAsc(values).reverse()
}

export function sortAssessmentsDesc(rows: Assessment[]): Assessment[] {
  return [...rows].sort((left, right) => (
    right.data.localeCompare(left.data)
    || right.createdAt.localeCompare(left.createdAt)
    || right.avgFinal - left.avgFinal
  ))
}

export function averageScore(rows: Assessment[]): number | null {
  if (!rows.length) return null
  return Math.round(rows.reduce((acc, item) => acc + item.avgFinal, 0) / rows.length)
}

export function sectionAverage(assessment: Assessment, sectionKey: string): number | null {
  const value = assessment.secAvg[sectionKey]
  if (typeof value === 'number') return value

  const def = ASSESSMENT_DEFS[assessment.type]
  const section = def.sections.find((item) => item.key === sectionKey)
  if (!section) return null

  const values = section.criteria.flatMap((_, criterionIndex) => (
    assessment.snapshotScores[section.key]?.[criterionIndex] || []
  )).filter((value) => value !== 'nd') as number[]

  if (!values.length) return null
  return Math.round((values.reduce((acc, value) => acc + value, 0) / values.length) * 100)
}

export function criterionAverage(
  assessment: Assessment,
  sectionKey: string,
  criterionIndex: number,
): number | null {
  const values = (assessment.snapshotScores[sectionKey]?.[criterionIndex] || []).filter((value) => value !== 'nd') as number[]
  if (!values.length) return null
  return Math.round((values.reduce((acc, value) => acc + value, 0) / values.length) * 100)
}

export function scoreValueLabel(value: ScoreValue): string {
  if (value === 'nd') return 'N/D'
  if (value === 1) return '1'
  if (value === 0.5) return '1/2'
  return '0'
}

export function scoreValuePercent(value: ScoreValue): string {
  if (value === 'nd') return 'N/D'
  return `${Math.round(value * 100)}%`
}

export function formatAssessmentDate(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}


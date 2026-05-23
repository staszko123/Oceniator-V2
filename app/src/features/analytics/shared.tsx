import { TYPE_LABELS } from '../../domain/defs'
import type { Assessment, AssessmentType } from '../../domain/types'
import { defaultAnalyticsFilters, uniqueSorted, type AnalyticsFilters } from './filters'

export function AnalyticsFilterBar({
  assessments,
  filters,
  onChange,
}: {
  assessments: Assessment[]
  filters: AnalyticsFilters
  onChange: (filters: AnalyticsFilters) => void
}) {
  const periods = uniqueSorted(assessments.map((item) => item.period))
  const leaders = uniqueSorted(assessments.map((item) => item.oce || item.leaderScope))
  const specialists = uniqueSorted(assessments.map((item) => item.spec))

  return (
    <section className="analytics-filters">
      <label>
        <span>Okres</span>
        <select value={filters.period} onChange={(event) => onChange({ ...filters, period: event.target.value })}>
          <option value="all">Wszystkie</option>
          {periods.map((period) => <option key={period} value={period}>{period}</option>)}
        </select>
      </label>
      <label>
        <span>Typ</span>
        <select value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value as AssessmentType | 'all' })}>
          <option value="all">Wszystkie</option>
          {(Object.keys(TYPE_LABELS) as AssessmentType[]).map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
        </select>
      </label>
      <label>
        <span>Lider</span>
        <select value={filters.leader} onChange={(event) => onChange({ ...filters, leader: event.target.value })}>
          <option value="all">Wszyscy</option>
          {leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}
        </select>
      </label>
      <label>
        <span>Specjalista</span>
        <select value={filters.specialist} onChange={(event) => onChange({ ...filters, specialist: event.target.value })}>
          <option value="all">Wszyscy</option>
          {specialists.map((specialist) => <option key={specialist} value={specialist}>{specialist}</option>)}
        </select>
      </label>
      <button className="ghost-btn" type="button" onClick={() => onChange(defaultAnalyticsFilters())}>Reset</button>
    </section>
  )
}

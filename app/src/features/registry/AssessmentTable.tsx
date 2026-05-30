import { Edit3, Eye, FileText, Mail, MonitorCog, PhoneCall, ShieldCheck } from 'lucide-react'
import { TYPE_LABELS } from '../../domain/defs'
import { lastStatusEvent, shortDateTime } from '../../domain/history'
import type { Assessment, AssessmentType } from '../../domain/types'
import { statusLabels } from './registryExports'

function scoreClass(score: number): string {
  if (score >= 92) return 'score score-great'
  if (score >= 82) return 'score score-good'
  return 'score score-below'
}

function typeIcon(type: AssessmentType) {
  if (type === 'r') return <PhoneCall size={15} />
  if (type === 'm') return <Mail size={15} />
  return <MonitorCog size={15} />
}

export function AssessmentTable({
  assessments,
  compact = false,
  onPreview,
  onPrint,
  onEdit,
  canEditItem,
  onAdvance,
  canAdvanceItem,
  selectable = false,
  selectedIds = [],
  allVisibleSelected = false,
  onToggleSelect,
  onToggleSelectAll,
}: {
  assessments: Assessment[]
  compact?: boolean
  onPreview?: (assessment: Assessment) => void
  onPrint?: (assessment: Assessment) => void
  onEdit?: (assessment: Assessment) => void
  canEditItem?: (assessment: Assessment) => boolean
  onAdvance?: (assessment: Assessment) => void
  canAdvanceItem?: (assessment: Assessment) => boolean
  selectable?: boolean
  selectedIds?: string[]
  allVisibleSelected?: boolean
  onToggleSelect?: (id: string) => void
  onToggleSelectAll?: () => void
}) {
  if (!assessments.length) return <div className="empty-state">Brak danych dla aktualnych filtrow.</div>
  const hasActions = Boolean(onPreview || onPrint || onEdit || onAdvance)
  const showSelection = selectable && !compact

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {showSelection ? (
              <th className="select-col">
                <input checked={allVisibleSelected} onChange={() => onToggleSelectAll?.()} type="checkbox" aria-label="Zaznacz wszystkie widoczne karty" />
              </th>
            ) : null}
            <th>Specjalista</th>
            <th>Typ</th>
            <th>Okres</th>
            <th>Data</th>
            {!compact ? <th>Oceniajacy</th> : null}
            <th>Wynik</th>
            <th>Status</th>
            {!compact ? <th>Ostatnia zmiana</th> : null}
            {hasActions ? <th>Akcje</th> : null}
          </tr>
        </thead>
        <tbody>
          {assessments.map((item) => {
            const lastEvent = lastStatusEvent(item)
            const isSelected = selectedIds.includes(item.id)
            return (
              <tr key={item.id} className={isSelected ? 'selected-row' : ''}>
                {showSelection ? (
                  <td className="select-col">
                    <input checked={isSelected} onChange={() => onToggleSelect?.(item.id)} type="checkbox" aria-label={`Zaznacz karte ${item.spec}`} />
                  </td>
                ) : null}
                <td><strong>{item.spec}</strong><small>{item.dzial}</small></td>
                <td><span className="type-badge">{typeIcon(item.type)} {TYPE_LABELS[item.type]}</span></td>
                <td>{item.period}</td>
                <td>{item.data}</td>
                {!compact ? <td>{item.oce}</td> : null}
                <td><span className={scoreClass(item.avgFinal)}>{item.avgFinal}%</span></td>
                <td><span className={`status ${item.status}`}>{statusLabels[item.status]}</span></td>
                {!compact ? (
                  <td>
                    <div className="table-meta">
                      <strong>{lastEvent ? shortDateTime(lastEvent.at) : '-'}</strong>
                      <small className="table-subline">
                        {lastEvent ? `${lastEvent.by || 'system'} • ${lastEvent.note}` : 'Brak historii zmian'}
                      </small>
                    </div>
                  </td>
                ) : null}
                {hasActions ? (
                  <td>
                    <div className="table-actions">
                      {onPreview ? <button type="button" onClick={() => onPreview(item)} title="Podglad"><Eye size={15} /></button> : null}
                      {onPrint ? <button type="button" onClick={() => onPrint(item)} title="Drukuj"><FileText size={15} /></button> : null}
                      {onEdit && (!canEditItem || canEditItem(item)) ? <button type="button" onClick={() => onEdit(item)} title="Edytuj"><Edit3 size={15} /></button> : null}
                      {onAdvance && (!canAdvanceItem || canAdvanceItem(item)) ? <button type="button" onClick={() => onAdvance(item)} title="Zmien status"><ShieldCheck size={15} /></button> : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

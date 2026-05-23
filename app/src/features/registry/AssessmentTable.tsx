import { Edit3, Eye, FileText, Mail, MonitorCog, PhoneCall, ShieldCheck } from 'lucide-react'
import { TYPE_LABELS } from '../../domain/defs'
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
}: {
  assessments: Assessment[]
  compact?: boolean
  onPreview?: (assessment: Assessment) => void
  onPrint?: (assessment: Assessment) => void
  onEdit?: (assessment: Assessment) => void
  canEditItem?: (assessment: Assessment) => boolean
  onAdvance?: (assessment: Assessment) => void
  canAdvanceItem?: (assessment: Assessment) => boolean
}) {
  if (!assessments.length) return <div className="empty-state">Brak danych dla aktualnych filtrów.</div>
  const hasActions = Boolean(onPreview || onPrint || onEdit || onAdvance)
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Specjalista</th>
            <th>Typ</th>
            <th>Okres</th>
            <th>Data</th>
            {!compact ? <th>Oceniający</th> : null}
            <th>Wynik</th>
            <th>Status</th>
            {hasActions ? <th>Akcje</th> : null}
          </tr>
        </thead>
        <tbody>
          {assessments.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.spec}</strong><small>{item.dzial}</small></td>
              <td><span className="type-badge">{typeIcon(item.type)} {TYPE_LABELS[item.type]}</span></td>
              <td>{item.period}</td>
              <td>{item.data}</td>
              {!compact ? <td>{item.oce}</td> : null}
              <td><span className={scoreClass(item.avgFinal)}>{item.avgFinal}%</span></td>
              <td><span className={`status ${item.status}`}>{statusLabels[item.status]}</span></td>
              {hasActions ? (
                <td>
                  <div className="table-actions">
                    {onPreview ? <button type="button" onClick={() => onPreview(item)} title="Podgląd"><Eye size={15} /></button> : null}
                    {onPrint ? <button type="button" onClick={() => onPrint(item)} title="Drukuj"><FileText size={15} /></button> : null}
                    {onEdit && (!canEditItem || canEditItem(item)) ? <button type="button" onClick={() => onEdit(item)} title="Edytuj"><Edit3 size={15} /></button> : null}
                    {onAdvance && (!canAdvanceItem || canAdvanceItem(item)) ? <button type="button" onClick={() => onAdvance(item)} title="Zmien status"><ShieldCheck size={15} /></button> : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Assessment, Role } from '../../domain/types'
import { lastStatusEvent, shortDateTime } from '../../domain/history'
import { TYPE_LABELS } from '../../domain/defs'
import { assessmentTableColumnMap } from '../../config/tableColumnsConfig'
import { buildAssessmentActions } from '../../config/tableActionsConfig'
import { assessmentStatusConfig } from '../../config/status'
import { DataTable } from '../../components/data-table/DataTable'
import { useLanguage } from '../../i18n/LanguageContext'

function statusLabel(assessment: Assessment, t: (key: string, fallback?: string) => string) {
  return t(assessmentStatusConfig[assessment.status].labelKey, assessment.status)
}

function defaultSearchText(item: Assessment) {
  return `${item.spec} ${item.stand} ${item.dzial} ${item.oce} ${item.period} ${item.data} ${TYPE_LABELS[item.type]} ${item.status}`.toLowerCase()
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
  role = 'viewer',
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
  role?: Role
}) {
  const { t } = useLanguage()
  const specialistColumn = assessmentTableColumnMap.spec
  const typeColumn = assessmentTableColumnMap.type
  const periodColumn = assessmentTableColumnMap.period
  const createdAtColumn = assessmentTableColumnMap.data
  const scoreColumn = assessmentTableColumnMap.avgFinal

  const columns = useMemo(() => {
    const result: Array<{
      key: string
      label: string
      sortable?: boolean
      accessor?: (row: Assessment) => string | number | boolean | Date | null | undefined
      render?: (row: Assessment) => ReactNode
      exportValue?: (row: Assessment) => string | number | boolean | Date | null | undefined
    }> = [
      {
        ...specialistColumn,
        label: t('table.specialist'),
      },
      {
        ...typeColumn,
        label: t('table.type'),
      },
      {
        ...periodColumn,
        label: t('table.period'),
      },
      {
        ...createdAtColumn,
        label: t('table.createdAt'),
      },
    ]

    if (!compact) {
      result.push({
        key: 'oce',
        label: t('table.evaluator'),
        sortable: true,
        accessor: (row) => row.oce,
      })
    }

    result.push({
      ...scoreColumn,
      label: t('table.score'),
    })

    result.push({
      key: 'status',
      label: t('table.status'),
      sortable: true,
      accessor: (row) => statusLabel(row, t),
      render: (row) => <span className={`status ${row.status}`}>{statusLabel(row, t)}</span>,
      exportValue: (row) => statusLabel(row, t),
    })

    if (!compact) {
      result.push({
        key: 'lastChange',
        label: t('table.lastChange', 'Ostatnia zmiana'),
        sortable: true,
        accessor: (row) => lastStatusEvent(row)?.at || '',
        render: (row) => {
          const lastEvent = lastStatusEvent(row)
          return (
            <div className="table-meta">
              <strong>{lastEvent ? shortDateTime(lastEvent.at) : '-'}</strong>
              <small className="table-subline">
                {lastEvent ? `${lastEvent.by || 'system'} • ${lastEvent.note}` : 'Brak historii zmian'}
              </small>
            </div>
          )
        },
        exportValue: (row) => lastStatusEvent(row)?.at || '',
      })
    }

    return result
  }, [compact, createdAtColumn, periodColumn, scoreColumn, specialistColumn, t, typeColumn])

  const actions = useMemo(() => buildAssessmentActions(
    {
      onPreview,
      onPrint,
      onEdit,
      onAdvance,
    },
    {
      canEdit: canEditItem,
      canAdvance: canAdvanceItem,
    },
  ), [canAdvanceItem, canEditItem, onAdvance, onEdit, onPrint, onPreview])

  if (!assessments.length) {
    return <div className="empty-state">{t('table.noData')}</div>
  }

  return (
    <DataTable
      rows={assessments}
      columns={columns}
      getRowId={(row) => row.id}
      role={role}
      rowSearchText={defaultSearchText}
      actions={actions}
      compact={compact}
      selectable={selectable}
      selectedIds={selectedIds}
      allVisibleSelected={allVisibleSelected}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      onRowClick={onPreview}
      exportFilePrefix="oceniator-ewidencja"
      sheetName="Ewidencja"
    />
  )
}

export default AssessmentTable

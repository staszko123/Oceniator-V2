import { Mail, MonitorCog, PhoneCall } from 'lucide-react'
import { TYPE_LABELS } from '../domain/defs'
import { assessmentStatusConfig } from './status'
import type { Assessment } from '../domain/types'
import type { TableColumn } from '../types/table'

export function assessmentTypeIcon(type: Assessment['type']) {
  if (type === 'r') return <PhoneCall size={15} />
  if (type === 'm') return <Mail size={15} />
  return <MonitorCog size={15} />
}

export const assessmentTableColumns: Array<TableColumn<Assessment>> = [
  {
    key: 'spec',
    labelKey: 'table.specialist',
    sortable: true,
    filterable: true,
    accessor: (row) => row.spec,
    exportValue: (row) => row.spec,
  },
  {
    key: 'type',
    labelKey: 'table.type',
    sortable: true,
    accessor: (row) => TYPE_LABELS[row.type],
    render: (row) => <span className="type-badge">{assessmentTypeIcon(row.type)} {TYPE_LABELS[row.type]}</span>,
    exportValue: (row) => TYPE_LABELS[row.type],
  },
  {
    key: 'period',
    labelKey: 'table.period',
    sortable: true,
    filterable: true,
    accessor: (row) => row.period,
  },
  {
    key: 'data',
    labelKey: 'table.createdAt',
    sortable: true,
    accessor: (row) => row.data,
  },
  {
    key: 'oce',
    labelKey: 'table.evaluator',
    sortable: true,
    accessor: (row) => row.oce,
  },
  {
    key: 'avgFinal',
    labelKey: 'table.score',
    sortable: true,
    align: 'right',
    accessor: (row) => row.avgFinal,
    exportValue: (row) => row.avgFinal,
  },
  {
    key: 'status',
    labelKey: 'table.status',
    sortable: true,
    accessor: (row) => assessmentStatusConfig[row.status]?.label || row.status,
    render: (row) => <span className={`status ${row.status}`}>{assessmentStatusConfig[row.status]?.label || row.status}</span>,
    exportValue: (row) => assessmentStatusConfig[row.status]?.label || row.status,
  },
]

export const assessmentTableColumnMap = Object.fromEntries(
  assessmentTableColumns.map((column) => [column.key, column]),
) as Record<string, TableColumn<Assessment>>

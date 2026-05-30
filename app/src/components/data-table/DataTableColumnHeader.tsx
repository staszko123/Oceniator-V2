import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import type { TableColumn, TableSortState } from '../../types/table'
import { useLanguage } from '../../i18n/LanguageContext'

export function DataTableColumnHeader<T>({
  column,
  sortState,
  onSort,
}: {
  column: TableColumn<T>
  sortState: TableSortState | null
  onSort: (key: string) => void
}) {
  const { t } = useLanguage()
  const label = column.label || (column.labelKey ? t(column.labelKey) : column.key)
  const active = sortState?.key === column.key

  return (
    <button
      type="button"
      className={column.sortable ? `table-sort-trigger ${active ? 'active' : ''}` : 'table-sort-trigger static'}
      disabled={!column.sortable}
      onClick={() => column.sortable && onSort(column.key)}
      title={column.sortable ? label : undefined}
    >
      <span>{label}</span>
      {column.sortable ? (
        active ? (sortState?.direction === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ChevronsUpDown size={13} />
      ) : null}
    </button>
  )
}


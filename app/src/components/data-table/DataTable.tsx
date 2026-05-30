import { useMemo } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { ContextMenu } from '../actions/ContextMenu'
import { ActionMenu } from '../actions/ActionMenu'
import { useContextMenu } from '../../hooks/useContextMenu'
import { useDataTable } from '../../hooks/useDataTable'
import { useLanguage } from '../../i18n/LanguageContext'
import type { Role } from '../../domain/types'
import type { TableAction, TableColumn } from '../../types/table'
import { DataTableColumnHeader } from './DataTableColumnHeader'
import { DataTablePagination } from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'
import { exportTableToXlsx } from './exportTable'

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  role,
  rowSearchText,
  actions = [],
  title,
  subtitle,
  loading,
  error,
  compact = false,
  selectable = false,
  selectedIds = [],
  allVisibleSelected = false,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onRowContextMenu,
  emptyState,
  initialSort,
  pageSizeOptions,
  initialPageSize,
  exportFilePrefix = 'export',
  sheetName = 'Export',
  extraToolbar,
}: {
  rows: T[]
  columns: Array<TableColumn<T>>
  getRowId: (row: T) => string
  role: Role
  rowSearchText?: (row: T) => string
  actions?: Array<TableAction<T>>
  title?: string
  subtitle?: string
  loading?: boolean
  error?: string | null
  compact?: boolean
  selectable?: boolean
  selectedIds?: string[]
  allVisibleSelected?: boolean
  onToggleSelect?: (id: string) => void
  onToggleSelectAll?: () => void
  onRowClick?: (row: T) => void
  onRowContextMenu?: (row: T) => void
  emptyState?: ReactNode
  initialSort?: { key: string; direction: 'asc' | 'desc' }
  pageSizeOptions?: number[]
  initialPageSize?: number
  exportFilePrefix?: string
  sheetName?: string
  extraToolbar?: ReactNode
}) {
  const { t } = useLanguage()
  const contextMenu = useContextMenu<T>()
  const tableColumns = useMemo(() => columns.filter((column) => !column.hidden), [columns])
  const dataTable = useDataTable({
    rows,
    columns: tableColumns,
    getRowId,
    rowSearchText,
    initialSort,
    initialPageSize,
    pageSizeOptions,
  })

  const exportColumns = useMemo(() => tableColumns.filter((column) => !column.hidden), [tableColumns])
  const hasActions = actions.length > 0
  const visibleRows = dataTable.pageRows

  async function exportXlsx() {
    await exportTableToXlsx({
      rows: dataTable.sortedRows,
      columns: exportColumns,
      filePrefix: exportFilePrefix,
      sheetName,
      getLabel: (column) => column.label || (column.labelKey ? t(column.labelKey) : column.key),
    })
  }

  if (loading) {
    return <div className="empty-state">{t('table.loading')}</div>
  }

  if (error) {
    return <div className="error-box">{error || t('table.error')}</div>
  }

  if (!rows.length || dataTable.sortedRows.length === 0) {
    return <div className="empty-state">{emptyState || t('table.noData')}</div>
  }

  return (
    <div className="data-table-shell">
      <div className="data-table-shell-head">
        {(title || subtitle) ? (
          <div className="data-table-shell-copy">
            {title ? <strong>{title}</strong> : null}
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
        ) : null}
        <DataTableToolbar
          searchQuery={dataTable.searchQuery}
          onSearchQueryChange={dataTable.setSearchQuery}
          pageSize={dataTable.pageSize}
          onPageSizeChange={dataTable.setPageSize}
          pageSizeOptions={dataTable.pageSizeOptions}
          totalRows={dataTable.totalRows}
          visibleRows={visibleRows.length}
          onExportXlsx={exportXlsx}
          extraActions={extraToolbar}
        />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {selectable ? (
                <th className="select-col">
                  <input
                    checked={allVisibleSelected}
                    onChange={() => onToggleSelectAll?.()}
                    type="checkbox"
                    aria-label={t('table.selectAll')}
                  />
                </th>
              ) : null}
              {tableColumns.map((column) => (
                <th key={column.key} className={column.align ? `align-${column.align}` : undefined}>
                  <DataTableColumnHeader column={column} sortState={dataTable.sortState} onSort={dataTable.toggleSort} />
                </th>
              ))}
              {hasActions ? <th className="actions-col">{t('table.actions')}</th> : null}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const rowId = getRowId(row)
              const isSelected = selectedIds.includes(rowId)
              return (
                <tr
                  key={rowId}
                  className={`${isSelected ? 'selected-row' : ''} ${compact ? 'compact-row' : ''}`}
                  onClick={() => onRowClick?.(row)}
                  onContextMenu={(event) => {
                    if (!actions.length) return
                    event.preventDefault()
                    contextMenu.open(event as ReactMouseEvent<HTMLElement>, row)
                    onRowContextMenu?.(row)
                  }}
                >
                  {selectable ? (
                    <td className="select-col" onClick={(event) => event.stopPropagation()}>
                      <input
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(rowId)}
                        type="checkbox"
                        aria-label={t('action.viewDetails')}
                      />
                    </td>
                  ) : null}
                  {tableColumns.map((column) => (
                    <td key={column.key} className={column.className || (column.align ? `align-${column.align}` : undefined)}>
                      {column.render ? column.render(row) : String(column.accessor ? column.accessor(row) ?? '' : (row as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                  {hasActions ? (
                    <td className="actions-col" onClick={(event) => event.stopPropagation()}>
                      <ActionMenu row={row} actions={actions} role={role} />
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="data-table-shell-footer">
        <DataTablePagination page={dataTable.safePage} totalPages={dataTable.totalPages} onPageChange={dataTable.setPage} />
      </div>
      <ContextMenu
        state={contextMenu.state}
        actions={actions}
        role={role}
        onClose={contextMenu.close}
      />
    </div>
  )
}

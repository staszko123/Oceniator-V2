import { useMemo, useState } from 'react'
import type { TableColumn, TableSortDirection, TableSortState } from '../types/table'

export interface UseDataTableOptions<T> {
  rows: T[]
  columns: Array<TableColumn<T>>
  getRowId: (row: T) => string
  rowSearchText?: (row: T) => string
  initialSort?: TableSortState
  initialPageSize?: number
  pageSizeOptions?: number[]
}

function toComparable(value: string | number | boolean | Date | null | undefined): string | number {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'boolean') return value ? 1 : 0
  return value
}

function compareValues(left: string | number, right: string | number, direction: TableSortDirection): number {
  const factor = direction === 'asc' ? 1 : -1
  if (typeof left === 'number' && typeof right === 'number') {
    return (left - right) * factor
  }
  return String(left).localeCompare(String(right), 'pl', { sensitivity: 'base' }) * factor
}

export function getDefaultSortState<T>(columns: Array<TableColumn<T>>, initialSort?: TableSortState): TableSortState | null {
  if (initialSort) return initialSort
  const firstSortableKey = columns.find((column) => column.sortable)?.key || columns[0]?.key || ''
  if (!firstSortableKey) return null
  return { key: firstSortableKey, direction: 'asc' }
}

export function filterTableRows<T>(
  rows: T[],
  searchQuery: string,
  rowSearchText?: (row: T) => string,
): T[] {
  const normalizedQuery = searchQuery.trim().toLowerCase()
  if (!normalizedQuery) return rows
  if (!rowSearchText) return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(normalizedQuery))
  return rows.filter((row) => rowSearchText(row).toLowerCase().includes(normalizedQuery))
}

export function sortTableRows<T>(
  rows: T[],
  columns: Array<TableColumn<T>>,
  sortState: TableSortState | null,
): T[] {
  if (!sortState?.key) return rows
  const column = columns.find((item) => item.key === sortState.key)
  if (!column) return rows
  const accessor = column.accessor || ((row: T) => (row as Record<string, unknown>)[column.key] as string | number | boolean | Date | null | undefined)
  return [...rows].sort((left, right) => compareValues(
    toComparable(accessor(left)),
    toComparable(accessor(right)),
    sortState.direction,
  ))
}

export function paginateTableRows<T>(rows: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  return {
    totalPages,
    safePage,
    pageRows: rows.slice(start, start + pageSize),
  }
}

export function useDataTable<T>({
  rows,
  columns,
  rowSearchText,
  initialSort,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
}: UseDataTableOptions<T>) {
  const defaultSort = getDefaultSortState(columns, initialSort)

  const [searchQuery, setSearchQueryState] = useState('')
  const [sortState, setSortState] = useState<TableSortState | null>(defaultSort)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [page, setPage] = useState(1)

  function setSearchQuery(next: string) {
    setPage(1)
    setSearchQueryState(next)
  }

  function setPageSize(next: number) {
    setPage(1)
    setPageSizeState(next)
  }

  const searchableRows = useMemo(
    () => filterTableRows(rows, searchQuery, rowSearchText),
    [rowSearchText, rows, searchQuery],
  )

  const sortedRows = useMemo(
    () => sortTableRows(searchableRows, columns, sortState),
    [columns, searchableRows, sortState],
  )

  const totalRows = sortedRows.length
  const { totalPages, safePage, pageRows } = useMemo(
    () => paginateTableRows(sortedRows, page, pageSize),
    [page, pageSize, sortedRows],
  )

  function toggleSort(key: string) {
    setPage(1)
    setSortState((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { key, direction: 'asc' }
    })
  }

  return {
    searchQuery,
    setSearchQuery,
    sortState,
    toggleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions,
    totalRows,
    totalPages,
    filteredRows: searchableRows,
    sortedRows,
    pageRows,
    getVisibleRowIds: (getRowId: (row: T) => string) => pageRows.map(getRowId),
    safePage,
  }
}

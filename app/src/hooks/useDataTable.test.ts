import { describe, expect, it } from 'vitest'
import type { TableColumn } from '../types/table'
import { filterTableRows, getDefaultSortState, paginateTableRows, sortTableRows } from './useDataTable'

type Row = {
  id: string
  name: string
  score: number
  createdAt: string
}

const rows: Row[] = [
  { id: '1', name: 'Beta', score: 82, createdAt: '2026-05-29' },
  { id: '2', name: 'Alpha', score: 96, createdAt: '2026-05-30' },
  { id: '3', name: 'Gamma', score: 71, createdAt: '2026-05-28' },
]

const columns: Array<TableColumn<Row>> = [
  { key: 'name', label: 'Name', sortable: true, accessor: (row) => row.name },
  { key: 'score', label: 'Score', sortable: true, accessor: (row) => row.score },
  { key: 'createdAt', label: 'Created at', sortable: true, accessor: (row) => row.createdAt },
]

describe('data table helpers', () => {
  it('chooses a sane default sort state', () => {
    expect(getDefaultSortState(columns)).toEqual({ key: 'name', direction: 'asc' })
    expect(getDefaultSortState(columns, { key: 'score', direction: 'desc' })).toEqual({ key: 'score', direction: 'desc' })
  })

  it('filters rows using explicit search text when provided', () => {
    const filtered = filterTableRows(rows, 'alp', (row) => `${row.name} ${row.score}`)
    expect(filtered.map((row) => row.id)).toEqual(['2'])
  })

  it('sorts rows by column accessor', () => {
    const sorted = sortTableRows(rows, columns, { key: 'score', direction: 'desc' })
    expect(sorted.map((row) => row.id)).toEqual(['2', '1', '3'])
  })

  it('paginates rows safely', () => {
    const page = paginateTableRows(rows, 2, 2)
    expect(page.totalPages).toBe(2)
    expect(page.safePage).toBe(2)
    expect(page.pageRows.map((row) => row.id)).toEqual(['3'])
  })
})

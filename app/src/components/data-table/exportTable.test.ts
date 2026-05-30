import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportTableToXlsx } from './exportTable'
import type { TableColumn } from '../../types/table'

vi.mock('xlsx', () => {
  const aoaToSheet = vi.fn((data: unknown[][]) => ({ __data: data }))
  const bookNew = vi.fn(() => ({ __workbook: true }))
  const bookAppendSheet = vi.fn()
  const writeFile = vi.fn()

  return {
    utils: {
      aoa_to_sheet: aoaToSheet,
      book_new: bookNew,
      book_append_sheet: bookAppendSheet,
    },
    writeFile,
  }
})

type Row = {
  name: string
  score: number
  hiddenValue: string
  createdAt: Date
}

const columns: Array<TableColumn<Row>> = [
  { key: 'name', label: 'Name', accessor: (row) => row.name },
  { key: 'score', label: 'Score', accessor: (row) => row.score },
  { key: 'hiddenValue', label: 'Hidden', hidden: true, accessor: (row) => row.hiddenValue },
  { key: 'createdAt', label: 'Created', accessor: (row) => row.createdAt },
]

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('exportTableToXlsx', () => {
  it('exports only visible columns with the current data order', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-30T12:00:00.000Z'))

    const rows: Row[] = [
      { name: 'Anna', score: 93, hiddenValue: 'secret', createdAt: new Date('2026-05-29T08:30:00.000Z') },
    ]

    await exportTableToXlsx({
      rows,
      columns,
      filePrefix: 'oceniator-test',
      sheetName: 'Test sheet',
      getLabel: (column) => column.label || column.key,
    })

    const xlsx = await import('xlsx')
    expect(xlsx.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ['Name', 'Score', 'Created'],
      ['Anna', 93, '2026-05-29T08:30:00.000Z'],
    ])
    expect(xlsx.utils.book_append_sheet).toHaveBeenCalledTimes(1)
    expect(xlsx.writeFile).toHaveBeenCalledWith(expect.any(Object), 'oceniator-test_2026-05-30.xlsx')

  })
})

import type { TableColumn } from '../../types/table'

function toCellString(value: unknown): string | number {
  if (value instanceof Date) return value.toISOString()
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? '1' : '0'
  return value as string | number
}

export async function exportTableToXlsx<T>({
  rows,
  columns,
  filePrefix,
  sheetName,
  getLabel,
}: {
  rows: T[]
  columns: Array<TableColumn<T>>
  filePrefix: string
  sheetName: string
  getLabel: (column: TableColumn<T>) => string
}) {
  const { utils, writeFile } = await import('xlsx')
  const visibleColumns = columns.filter((column) => !column.hidden)
  const header = visibleColumns.map((column) => getLabel(column))
  const body = rows.map((row) => visibleColumns.map((column) => {
    if (column.exportValue) return toCellString(column.exportValue(row))
    if (column.accessor) return toCellString(column.accessor(row))
    return ''
  }))
  const worksheet = utils.aoa_to_sheet([header, ...body])
  worksheet['!cols'] = visibleColumns.map((column) => ({ wch: Math.max(12, Math.min(42, getLabel(column).length + 4)) }))
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  const date = new Date().toISOString().slice(0, 10)
  writeFile(workbook, `${filePrefix}_${date}.xlsx`)
}


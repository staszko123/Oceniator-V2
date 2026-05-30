import { TYPE_LABELS } from '../../domain/defs'
import { ratingLabel } from '../../domain/scoring'
import type { Assessment, AssessmentStatus } from '../../domain/types'

const statusLabels: Record<AssessmentStatus, string> = {
  submitted: 'Do weryfikacji',
  review: 'W weryfikacji',
  approved: 'Zatwierdzona',
  archived: 'Archiwum',
}

function downloadFile(fileName: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export type ReportMode = 'detail' | 'summary' | 'trend'

export type ReportTable = {
  title: string
  description: string
  fileName: string
  columns: string[]
  rows: Array<Array<string | number>>
}

function buildCsv(columns: string[], rows: Array<Array<string | number>>) {
  return `\uFEFF${[columns, ...rows].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
}

export function exportTableCsv(table: ReportTable) {
  downloadFile(`${table.fileName}.csv`, 'text/csv;charset=utf-8', buildCsv(table.columns, table.rows))
}

export async function exportTableExcel(table: ReportTable) {
  const { utils, writeFile } = await import('xlsx')
  const worksheet = utils.aoa_to_sheet([table.columns, ...table.rows])
  worksheet['!cols'] = table.columns.map((label) => ({ wch: Math.max(14, Math.min(36, label.length + 6)) }))
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, table.title.slice(0, 31))
  writeFile(workbook, `${table.fileName}.xlsx`)
}

export function buildReportTable(rows: Assessment[], mode: ReportMode): ReportTable {
  if (mode === 'detail') {
    return {
      title: 'Raport szczegółowy',
      description: 'Jeden wiersz na kartę z podstawowymi polami operacyjnymi.',
      fileName: 'oceniator-raport-szczegolowy',
      columns: ['Data', 'Okres', 'Typ', 'Specjalista', 'Lider', 'Dział', 'Stanowisko', 'Wynik', 'Ocena', 'Status', 'Kontakty'],
      rows: [...rows]
        .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt))
        .map((item) => [
          item.data,
          item.period,
          TYPE_LABELS[item.type],
          item.spec,
          item.oce || item.leaderScope,
          item.dzial,
          item.stand,
          `${item.avgFinal}%`,
          ratingLabel(item.rating),
          statusLabels[item.status],
          item.contactCount,
        ]),
    }
  }

  if (mode === 'summary') {
    const buckets = new Map<string, Assessment[]>()
    rows.forEach((item) => {
      buckets.set(item.spec, [...(buckets.get(item.spec) || []), item])
    })
    return {
      title: 'Raport specjalistów',
      description: 'Agregacja wyników per specjalista wraz z rozkładem ocen.',
      fileName: 'oceniator-raport-specjalisci',
      columns: ['Specjalista', 'Lider', 'Dział', 'Stanowisko', 'Kart', 'Średnia', 'Min', 'Max', 'Bardzo dobry', 'Dobry', 'Poniżej standardu', 'Ostatnia karta'],
      rows: [...buckets.entries()]
        .map(([specialist, specialistRows]) => {
          const scores = specialistRows.map((item) => item.avgFinal)
          const average = Math.round(scores.reduce((acc, value) => acc + value, 0) / scores.length)
          const last = [...specialistRows].sort((a, b) => b.data.localeCompare(a.data))[0]
          return [
            specialist,
            last?.oce || last?.leaderScope || '',
            last?.dzial || '',
            last?.stand || '',
            specialistRows.length,
            `${average}%`,
            `${Math.min(...scores)}%`,
            `${Math.max(...scores)}%`,
            specialistRows.filter((item) => item.rating === 'great').length,
            specialistRows.filter((item) => item.rating === 'good').length,
            specialistRows.filter((item) => item.rating === 'below').length,
            last?.data || '',
          ]
        })
        .sort((left, right) => Number(String(left[5]).replace('%', '')) - Number(String(right[5]).replace('%', ''))),
    }
  }

  const trendBuckets = new Map<string, Assessment[]>()
  rows.forEach((item) => {
    const key = `${item.spec}__${item.period}`
    trendBuckets.set(key, [...(trendBuckets.get(key) || []), item])
  })
  return {
    title: 'Raport trendów',
    description: 'Zestawienie wyników per specjalista i okres rozliczeniowy.',
    fileName: 'oceniator-raport-trendy',
    columns: ['Specjalista', 'Okres', 'Lider', 'Dział', 'Kart', 'Średnia', 'Bardzo dobry', 'Poniżej standardu', 'Do decyzji'],
    rows: [...trendBuckets.entries()]
      .map(([, trendRows]) => {
        const last = [...trendRows].sort((a, b) => b.data.localeCompare(a.data))[0]
        const avg = Math.round(trendRows.reduce((acc, item) => acc + item.avgFinal, 0) / trendRows.length)
        return [
          last?.spec || '',
          last?.period || '',
          last?.oce || last?.leaderScope || '',
          last?.dzial || '',
          trendRows.length,
          `${avg}%`,
          trendRows.filter((item) => item.rating === 'great').length,
          trendRows.filter((item) => item.rating === 'below').length,
          trendRows.filter((item) => item.status === 'review' || item.status === 'submitted').length,
        ]
      })
      .sort((left, right) => String(left[1]).localeCompare(String(right[1]), 'pl') || String(left[0]).localeCompare(String(right[0]), 'pl')),
  }
}

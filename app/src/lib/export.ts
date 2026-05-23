/** Eksport danych do plików */

import { utils, writeFile } from 'xlsx'
import type { Assessment } from '../domain/types'
import { esc } from './format'

export function downloadFile(fileName: string, mime: string, content: string) {
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

/** Prawdziwy eksport Excel .xlsx przy użyciu SheetJS */
export function exportExcel(rows: Assessment[]) {
  const header = ['Specjalista', 'Stanowisko', 'Dział', 'Typ', 'Okres', 'Data', 'Oceniający', 'Wynik', 'Ocena', 'Status']
  const tableRows = rows.map((item) => [
    item.spec,
    item.stand,
    item.dzial,
    item.type === 'r' ? 'Rozmowy' : item.type === 'm' ? 'Maile' : 'Systemy',
    item.period,
    item.data,
    item.oce,
    `${item.avgFinal}%`,
    item.avgFinal >= 92 ? 'Bardzo dobry' : item.avgFinal >= 82 ? 'Dobry' : 'Do poprawy',
    item.status === 'submitted' ? 'Do weryfikacji' : item.status === 'review' ? 'W weryfikacji' : item.status === 'approved' ? 'Zatwierdzona' : 'Archiwum',
  ])
  
  const ws = utils.aoa_to_sheet([header, ...tableRows])
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Ewidencja')
  writeFile(wb, 'oceniator-ewidencja.xlsx')
}

export function exportCsv(rows: Assessment[]) {
  const statusLabels: Record<string, string> = {
    submitted: 'Do weryfikacji',
    review: 'W weryfikacji',
    approved: 'Zatwierdzona',
    archived: 'Archiwum',
  }
  
  const ratingLabel = (rating: number) => rating >= 92 ? 'Bardzo dobry' : rating >= 82 ? 'Dobry' : 'Do poprawy'
  
  const header = ['Specjalista', 'Stanowisko', 'Dział', 'Typ', 'Okres', 'Data', 'Oceniający', 'Wynik', 'Ocena', 'Status']
  const body = rows.map((item) => [
    item.spec,
    item.stand,
    item.dzial,
    item.type === 'r' ? 'Rozmowy' : item.type === 'm' ? 'Maile' : 'Systemy',
    item.period,
    item.data,
    item.oce,
    item.avgFinal,
    ratingLabel(item.avgFinal),
    statusLabels[item.status],
  ])
  const csv = `\uFEFF${[header, ...body].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
  downloadFile('oceniator-ewidencja.csv', 'text/csv;charset=utf-8', csv)
}

export function exportJson(rows: Assessment[]) {
  downloadFile('oceniator-ewidencja.json', 'application/json;charset=utf-8', JSON.stringify(rows, null, 2))
}

/** Drukowanie oceny jako PDF */
export function printAssessment(assessment: Assessment): boolean {
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${esc(assessment.spec)}</title>
    <style>body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#0f172a}
    header{background:#0b1c32;color:#fff;padding:18px;border-radius:8px;margin-bottom:16px}
    h1{margin:0;font-size:22px}small{opacity:0.8}.result{font-size:38px;font-weight:900;color:#16a34a}
    @media print{.no-print{display:none}}</style></head><body>
    <div class="no-print" style="position:sticky;top:0;background:#07111f;padding:10px;text-align:right;margin:-24px -24px 24px">
      <button onclick="window.print()" style="background:#0f8f87;color:#fff;border:0;border-radius:6px;padding:9px 14px;font-weight:700;cursor:pointer">Drukuj / Zapisz PDF</button>
    </div>
    <header><div><h1>Ocena Jakości</h1><small>System Oceny Jakości</small></div>
    <div class="result">${assessment.avgFinal}%</div></header>
    <p><strong>Specjalista:</strong> ${esc(assessment.spec)} | <strong>Stanowisko:</strong> ${esc(assessment.stand)} | <strong>Dział:</strong> ${esc(assessment.dzial)}</p>
    <p><strong>Data:</strong> ${esc(assessment.data)} | <strong>Oceniający:</strong> ${esc(assessment.oce)} | <strong>Status:</strong> ${esc(assessment.status)}</p>
    <p><strong>Podsumowanie:</strong> ${esc(assessment.notes || 'Brak uwag.')}</p>
    </body></html>`
  
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  return true
}

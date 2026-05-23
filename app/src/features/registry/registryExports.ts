import { ASSESSMENT_DEFS, TYPE_LABELS } from '../../domain/defs'
import { ratingLabel } from '../../domain/scoring'
import type { Assessment, AssessmentStatus } from '../../domain/types'

export const statusLabels: Record<AssessmentStatus, string> = {
  submitted: 'Do weryfikacji',
  review: 'W weryfikacji',
  approved: 'Zatwierdzona',
  archived: 'Archiwum',
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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

export function exportCsv(rows: Assessment[]) {
  const header = ['Specjalista', 'Stanowisko', 'Dział', 'Typ', 'Okres', 'Data', 'Oceniający', 'Wynik', 'Ocena', 'Status']
  const body = rows.map((item) => [
    item.spec,
    item.stand,
    item.dzial,
    TYPE_LABELS[item.type],
    item.period,
    item.data,
    item.oce,
    item.avgFinal,
    ratingLabel(item.rating),
    statusLabels[item.status],
  ])
  const csv = `\uFEFF${[header, ...body].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
  downloadFile('oceniator-ewidencja.csv', 'text/csv;charset=utf-8', csv)
}

export function exportJson(rows: Assessment[]) {
  downloadFile('oceniator-ewidencja.json', 'application/json;charset=utf-8', JSON.stringify(rows, null, 2))
}

export async function exportExcel(rows: Assessment[]) {
  const { utils, writeFile } = await import('xlsx')
  const header = ['Specjalista', 'Stanowisko', 'Dział', 'Typ', 'Okres', 'Data', 'Oceniający', 'Wynik', 'Ocena', 'Status']
  const tableRows = rows.map((item) => ({
    Specjalista: item.spec,
    Stanowisko: item.stand,
    Dział: item.dzial,
    Typ: TYPE_LABELS[item.type],
    Okres: item.period,
    Data: item.data,
    Oceniający: item.oce,
    Wynik: item.avgFinal,
    Ocena: ratingLabel(item.rating),
    Status: statusLabels[item.status],
  }))
  const worksheet = utils.json_to_sheet(tableRows, { header })
  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
  ]
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, 'Ewidencja')
  writeFile(workbook, 'oceniator-ewidencja.xlsx')
}

export function printAssessment(assessment: Assessment): boolean {
  const def = ASSESSMENT_DEFS[assessment.type]
  const sections = def.sections.map((section) => {
    const rows = section.criteria.map((criterion, criterionIndex) => {
      const cells = Array.from({ length: assessment.contactCount }, (_, contactIndex) => {
        const value = assessment.snapshotScores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
        return `<td><strong>${value === 'nd' ? 'N/D' : value}</strong></td>`
      }).join('')
      return `<tr><td>${esc(criterion.name)}</td>${cells}</tr>`
    }).join('')
    const headings = Array.from({ length: assessment.contactCount }, (_, index) => `<th>${esc(def.contactLabel)} ${index + 1}</th>`).join('')
    return `<section><h2>${esc(section.label)} <small>waga ${Math.round(section.weight * 100)}%</small></h2><table><thead><tr><th>Kryterium</th>${headings}</tr></thead><tbody>${rows}</tbody></table></section>`
  }).join('')

  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${esc(def.name)} - ${esc(assessment.spec)}</title><style>
    body{font-family:Arial,sans-serif;margin:0;color:#0f172a;background:#fff}
    .page{max-width:1100px;margin:0 auto;padding:28px}
    header{background:#0b1c32;color:#fff;padding:18px 22px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;gap:18px}
    h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:20px 0 0;background:#0f766e;color:#fff;padding:10px 12px;border-radius:8px 8px 0 0}
    small{opacity:.72}.meta{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}.meta div{border:1px solid #dce6ef;padding:10px;border-radius:6px}
    .meta span{display:block;color:#64748b;font-size:10px;text-transform:uppercase;font-weight:700}.meta strong{font-size:12px}
    table{width:100%;border-collapse:collapse;border:1px solid #dce6ef}th,td{border-bottom:1px solid #dce6ef;padding:8px;text-align:left;font-size:12px}th{background:#f7fafc;color:#64748b;text-transform:uppercase;font-size:10px}
    .result{font-size:38px;font-weight:900;color:#16a34a}.notes{white-space:pre-wrap;border:1px solid #dce6ef;border-radius:6px;padding:12px;margin-top:16px}
    .nopr{position:sticky;top:0;background:#07111f;padding:10px;text-align:right}.nopr button{background:#0f8f87;color:#fff;border:0;border-radius:6px;padding:9px 14px;font-weight:700}
    @media print{.nopr{display:none}.page{padding:12mm}header{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body><div class="nopr"><button onclick="window.print()">Drukuj / Zapisz PDF</button></div><div class="page">
    <header><div><h1>${esc(def.name)}</h1><small>System Oceny Jakości PeP & P24</small></div><div class="result">${assessment.avgFinal}%</div></header>
    <div class="meta">
      <div><span>Specjalista</span><strong>${esc(assessment.spec)}</strong></div>
      <div><span>Stanowisko</span><strong>${esc(assessment.stand)}</strong></div>
      <div><span>Dział</span><strong>${esc(assessment.dzial)}</strong></div>
      <div><span>Oceniający</span><strong>${esc(assessment.oce)}</strong></div>
      <div><span>Data</span><strong>${esc(assessment.data)}</strong></div>
    </div>
    ${sections}
    <div class="notes"><strong>Podsumowanie:</strong><br>${esc(assessment.notes || 'Brak uwag.')}</div>
  </div></body></html>`

  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  return true
}

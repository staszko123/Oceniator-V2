import { ASSESSMENT_DEFS, TYPE_LABELS } from '../../domain/defs'
import type { Assessment, AssessmentStatus } from '../../domain/types'

const statusLabels: Record<AssessmentStatus, string> = {
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

function weakestCriteria(rows: Assessment[]) {
  const buckets = new Map<string, { label: string; sum: number; count: number }>()
  rows.forEach((assessment) => {
    const def = ASSESSMENT_DEFS[assessment.type]
    def.sections.forEach((section) => {
      section.criteria.forEach((criterion, criterionIndex) => {
        const values = (assessment.snapshotScores[section.key]?.[criterionIndex] || []).filter((value) => value !== 'nd') as number[]
        if (!values.length) return
        const key = `${assessment.type}-${section.key}-${criterionIndex}`
        const current = buckets.get(key) || { label: `${TYPE_LABELS[assessment.type]} • ${criterion.name}`, sum: 0, count: 0 }
        current.sum += values.reduce((acc, value) => acc + value, 0)
        current.count += values.length
        buckets.set(key, current)
      })
    })
  })
  return [...buckets.values()]
    .map((item) => ({ label: item.label, avg: item.count ? Math.round(item.sum / item.count * 100) : 0, count: item.count }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 10)
}

export function specialistProfileData(assessments: Assessment[], specialist: string) {
  const rows = assessments
    .filter((item) => item.spec === specialist)
    .sort((a, b) => a.data.localeCompare(b.data))
  const recent = [...rows].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6)
  const trend = rows.slice(-6).map((item) => ({
    id: item.id,
    label: item.period || item.data,
    date: item.data,
    score: item.avgFinal,
    type: item.type,
    status: item.status,
  }))
  const weakAreas = weakestCriteria(rows).slice(0, 4)
  const avg = rows.length ? Math.round(rows.reduce((acc, item) => acc + item.avgFinal, 0) / rows.length) : 0
  const great = rows.filter((item) => item.rating === 'great').length
  const below = rows.filter((item) => item.rating === 'below').length
  const review = rows.filter((item) => item.status === 'review' || item.status === 'submitted').length
  const momentum = trend.length > 1 ? trend[trend.length - 1].score - trend[0].score : 0
  const recommendation = weakAreas[0]?.avg && weakAreas[0].avg < 82
    ? `Najwiekszy potencjal poprawy jest w obszarze: ${weakAreas[0].label}.`
    : 'Profil jest stabilny. Warto utrzymac rytm informacji zwrotnej i monitorowac ostatnie oceny.'

  return { rows, recent, trend, weakAreas, avg, great, below, review, momentum, recommendation }
}

export function printSpecialistProfileReport(specialist: string, assessments: Assessment[]): boolean {
  const profile = specialistProfileData(assessments, specialist)
  if (!profile.rows.length) return false

  const trendRows = profile.trend.map((item) => `
    <tr>
      <td>${esc(item.date)}</td>
      <td>${esc(TYPE_LABELS[item.type])}</td>
      <td>${esc(item.label)}</td>
      <td>${item.score}%</td>
      <td>${esc(statusLabels[item.status])}</td>
    </tr>
  `).join('')

  const weakRows = profile.weakAreas.length
    ? profile.weakAreas.map((item) => `
      <tr>
        <td>${esc(item.label)}</td>
        <td>${item.avg}%</td>
        <td>${item.count}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="3">Brak wystarczajacej liczby danych.</td></tr>'

  const recentRows = profile.recent.map((item) => `
    <tr>
      <td>${esc(item.data)}</td>
      <td>${esc(TYPE_LABELS[item.type])}</td>
      <td>${item.avgFinal}%</td>
      <td>${esc(statusLabels[item.status])}</td>
      <td>${esc(item.notes || 'Brak podsumowania koncowego.')}</td>
    </tr>
  `).join('')

  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${esc(specialist)} - profil jakosciowy</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#0f172a;background:#fff}
      header{background:#0b1c32;color:#fff;padding:20px;border-radius:10px;margin-bottom:18px}
      h1,h2,h3{margin:0}
      h2{font-size:18px;margin:0 0 10px}
      p{line-height:1.55}
      .kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}
      .kpi{border:1px solid #d7e2ee;border-radius:10px;padding:14px}
      .kpi span{display:block;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase}
      .kpi strong{display:block;margin-top:8px;font-size:28px}
      section{margin-bottom:18px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #d7e2ee;padding:10px;text-align:left;vertical-align:top;font-size:12px}
      th{background:#f8fafc;color:#475569;text-transform:uppercase;font-size:11px}
      .note{padding:12px 14px;border-radius:10px;background:#f8fafc;border:1px solid #d7e2ee}
      .no-print{position:sticky;top:0;background:#07111f;padding:10px;text-align:right;margin:-24px -24px 24px}
      .no-print button{background:#0f8f87;color:#fff;border:0;border-radius:6px;padding:9px 14px;font-weight:700;cursor:pointer}
      @media print{.no-print{display:none}}
    </style></head><body>
    <div class="no-print"><button onclick="window.print()">Drukuj / Zapisz PDF</button></div>
    <header>
      <h1>${esc(specialist)}</h1>
      <p>Profil jakosciowy specjalisty na podstawie ${profile.rows.length} kart. Sredni wynik: ${profile.avg}%. Do decyzji: ${profile.review}. Ponizej standardu: ${profile.below}.</p>
    </header>
    <div class="kpis">
      <div class="kpi"><span>Sredni wynik</span><strong>${profile.avg}%</strong></div>
      <div class="kpi"><span>Liczba kart</span><strong>${profile.rows.length}</strong></div>
      <div class="kpi"><span>Bardzo dobry</span><strong>${profile.great}</strong></div>
      <div class="kpi"><span>Ponizej standardu</span><strong>${profile.below}</strong></div>
    </div>
    <section>
      <h2>Rekomendacja</h2>
      <div class="note">${esc(profile.recommendation)}</div>
    </section>
    <section>
      <h2>Trend ostatnich ocen</h2>
      <table><thead><tr><th>Data</th><th>Typ</th><th>Okres</th><th>Wynik</th><th>Status</th></tr></thead><tbody>${trendRows}</tbody></table>
    </section>
    <section>
      <h2>Obszary do poprawy</h2>
      <table><thead><tr><th>Kryterium</th><th>Srednia</th><th>Liczba ocen czastkowych</th></tr></thead><tbody>${weakRows}</tbody></table>
    </section>
    <section>
      <h2>Ostatnie oceny</h2>
      <table><thead><tr><th>Data</th><th>Typ</th><th>Wynik</th><th>Status</th><th>Podsumowanie</th></tr></thead><tbody>${recentRows}</tbody></table>
    </section>
    </body></html>`

  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  return true
}

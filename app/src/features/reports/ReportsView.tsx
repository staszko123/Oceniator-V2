import { useMemo, useState } from 'react'
import { Download, Eye, FileText, TrendingUp, Users } from 'lucide-react'
import { AnalyticsFilterBar } from '../analytics/shared'
import { applyAnalyticsFilters, defaultAnalyticsFilters } from '../analytics/filters'
import { buildReportTable, exportTableCsv, exportTableExcel, type ReportMode } from './reporting'
import { SpecialistProfileModal } from '../specialists/profile'
import { printSpecialistProfileReport } from '../specialists/profileData'
import type { Assessment } from '../../domain/types'

function scoreClass(score: number): string {
  if (score >= 92) return 'score score-great'
  if (score >= 82) return 'score score-good'
  return 'score score-below'
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

function exportJson(rows: Assessment[]) {
  downloadFile('oceniator-ewidencja.json', 'application/json;charset=utf-8', JSON.stringify(rows, null, 2))
}

export default function ReportsView({ assessments }: { assessments: Assessment[] }) {
  const [filters, setFilters] = useState(() => defaultAnalyticsFilters())
  const [mode, setMode] = useState<ReportMode>('summary')
  const [selectedSpecialistProfile, setSelectedSpecialistProfile] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const filtered = useMemo(() => applyAnalyticsFilters(assessments, filters), [assessments, filters])
  const byLeader = useMemo(() => {
    const map = new Map<string, Assessment[]>()
    filtered.forEach((item) => {
      const key = item.oce || item.leaderScope || 'Brak'
      map.set(key, [...(map.get(key) || []), item])
    })
    return [...map.entries()].map(([leader, rows]) => ({
      leader,
      count: rows.length,
      avg: Math.round(rows.reduce((acc, item) => acc + item.avgFinal, 0) / rows.length),
      great: rows.filter((item) => item.rating === 'great').length,
      below: rows.filter((item) => item.rating === 'below').length,
      review: rows.filter((item) => item.status === 'review' || item.status === 'submitted').length,
    })).sort((a, b) => b.avg - a.avg)
  }, [filtered])

  const bySpecialist = useMemo(() => {
    const map = new Map<string, Assessment[]>()
    filtered.forEach((item) => {
      map.set(item.spec, [...(map.get(item.spec) || []), item])
    })
    return [...map.entries()].map(([specialist, rows]) => ({
      specialist,
      leader: rows[0]?.oce || rows[0]?.leaderScope || '',
      count: rows.length,
      avg: Math.round(rows.reduce((acc, item) => acc + item.avgFinal, 0) / rows.length),
      lastDate: [...rows].sort((a, b) => b.data.localeCompare(a.data))[0]?.data || '',
    })).sort((a, b) => a.avg - b.avg).slice(0, 20)
  }, [filtered])
  const reportTable = useMemo(() => buildReportTable(filtered, mode), [filtered, mode])
  const reportPreviewRows = reportTable.rows.slice(0, 24)
  const activeAvg = filtered.length ? Math.round(filtered.reduce((acc, item) => acc + item.avgFinal, 0) / filtered.length) : 0
  const activeBelow = filtered.filter((item) => item.rating === 'below').length
  const activeGreat = filtered.filter((item) => item.rating === 'great').length
  const activeReview = filtered.filter((item) => item.status === 'review' || item.status === 'submitted').length

  return (
    <main className="screen">
      <AnalyticsFilterBar assessments={assessments} filters={filters} onChange={setFilters} />
      <section className="data-panel">
        <div className="section-title">
          <span>Builder raportow</span>
          <small>{filtered.length} kart po filtrach</small>
        </div>
        <div className="report-mode-group">
          <button className={mode === 'detail' ? 'active' : ''} type="button" onClick={() => setMode('detail')}>
            <FileText size={15} /> Szczegółowy
          </button>
          <button className={mode === 'summary' ? 'active' : ''} type="button" onClick={() => setMode('summary')}>
            <Users size={15} /> Specjaliści
          </button>
          <button className={mode === 'trend' ? 'active' : ''} type="button" onClick={() => setMode('trend')}>
            <TrendingUp size={15} /> Trendy
          </button>
        </div>
        <div className="report-actions">
          <button className="ghost-btn" type="button" onClick={() => exportTableCsv(reportTable)}><Download size={16} /> Eksport CSV</button>
          <button className="ghost-btn" type="button" onClick={() => void exportTableExcel(reportTable)}><Download size={16} /> Eksport XLSX</button>
          <button className="ghost-btn" type="button" onClick={() => exportJson(filtered)}><Download size={16} /> Karty JSON</button>
          {filters.specialist !== 'all' ? (
            <button
              className="ghost-btn"
              type="button"
              onClick={() => setNotice(printSpecialistProfileReport(filters.specialist, filtered) ? '' : 'Przeglądarka zablokowała okno drukowania/PDF.')}
            >
              <FileText size={16} /> Raport PDF specjalisty
            </button>
          ) : null}
        </div>
        {notice ? <p className="hint-text">{notice}</p> : null}
        <div className="report-kpi-grid">
          <div className="metric-panel"><span>Sredni wynik</span><strong>{activeAvg || '-'}%</strong><small>w aktywnym filtrze</small></div>
          <div className="metric-panel"><span>Bardzo dobry</span><strong>{activeGreat}</strong><small>kart z oceną wysoką</small></div>
          <div className="metric-panel"><span>Poniżej standardu</span><strong>{activeBelow}</strong><small>wymagają reakcji</small></div>
          <div className="metric-panel"><span>Do decyzji</span><strong>{activeReview}</strong><small>submitted lub review</small></div>
        </div>
        <div className="report-preview-panel">
          <div className="section-title"><span>{reportTable.title}</span><small>{reportTable.rows.length} wierszy wynikowych</small></div>
          <p className="hint-text">{reportTable.description}</p>
          {reportTable.rows.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>{reportTable.columns.map((column) => <th key={column}>{column}</th>)}</tr>
                </thead>
                <tbody>
                  {reportPreviewRows.map((row, index) => (
                    <tr key={`${reportTable.fileName}-${index}`}>
                      {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state">Brak danych dla aktualnego zestawu filtrów.</div>}
          {reportTable.rows.length > reportPreviewRows.length ? <p className="hint-text">Pokazano pierwsze {reportPreviewRows.length} wiersze. Pełny zakres pobierzesz z eksportu.</p> : null}
        </div>
      </section>
      <section className="data-panel">
        <div className="section-title">
          <span>Raport liderów</span>
          <small>agregacja w bieżącym filtrze</small>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Lider</th><th>Karty</th><th>Średnia</th><th>Bardzo dobry</th><th>Poniżej standardu</th><th>Do decyzji</th></tr></thead>
            <tbody>
              {byLeader.map((item) => (
                <tr key={item.leader}>
                  <td><strong>{item.leader}</strong></td>
                  <td>{item.count}</td>
                  <td><span className={scoreClass(item.avg)}>{item.avg}%</span></td>
                  <td>{item.great}</td>
                  <td>{item.below}</td>
                  <td>{item.review}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Specjaliści do uwagi</span><small>najsłabsze średnie w filtrze</small></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Specjalista</th><th>Lider</th><th>Karty</th><th>Średnia</th><th>Ostatnia karta</th><th>Profil</th></tr></thead>
            <tbody>
              {bySpecialist.map((item) => (
                <tr key={item.specialist}>
                  <td><strong>{item.specialist}</strong></td>
                  <td>{item.leader}</td>
                  <td>{item.count}</td>
                  <td><span className={scoreClass(item.avg)}>{item.avg}%</span></td>
                  <td>{item.lastDate}</td>
                  <td>
                    <button className="ghost-btn table-inline-btn" type="button" onClick={() => setSelectedSpecialistProfile(item.specialist)}>
                      <Eye size={15} /> Profil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selectedSpecialistProfile ? (
        <SpecialistProfileModal
          specialist={selectedSpecialistProfile}
          assessments={filtered}
          onClose={() => setSelectedSpecialistProfile(null)}
        />
      ) : null}
    </main>
  )
}

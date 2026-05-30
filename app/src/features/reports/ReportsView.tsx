import { useMemo, useState } from 'react'
import { ClipboardCheck, Download, Eye, FileText, TrendingUp, Users } from 'lucide-react'
import { AnalyticsFilterBar } from '../analytics/shared'
import { applyAnalyticsFilters, defaultAnalyticsFilters } from '../analytics/filters'
import { recordDiagnostic } from '../../domain/diagnostics'
import { scoreClass } from '../../lib/display'
import { buildReportTable, exportTableCsv, exportTableExcel, type ReportMode } from './reporting'
import { SpecialistProfileModal } from '../specialists/profile'
import { printSpecialistProfileReport } from '../specialists/profileData'
import type { Assessment } from '../../domain/types'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

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

export default function ReportsView({
  assessments,
  setView,
  openRegistry,
  onStartAssessmentForSpecialist,
}: {
  assessments: Assessment[]
  setView: (view: ViewKey) => void
  openRegistry: (preset?: 'all' | 'decision' | 'recent' | 'edited') => void
  onStartAssessmentForSpecialist?: (name: string) => void
}) {
  const [filters, setFilters] = useState(() => defaultAnalyticsFilters())
  const [mode, setMode] = useState<ReportMode>('summary')
  const [selectedSpecialistProfile, setSelectedSpecialistProfile] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [showMore, setShowMore] = useState(false)

  const filtered = useMemo(() => applyAnalyticsFilters(assessments, filters), [assessments, filters])

  const byLeader = useMemo(() => {
    const map = new Map<string, Assessment[]>()
    filtered.forEach((item) => {
      const key = item.oce || item.leaderScope || 'Brak'
      map.set(key, [...(map.get(key) || []), item])
    })
    return [...map.entries()]
      .map(([leader, rows]) => ({
        leader,
        count: rows.length,
        avg: rows.length ? Math.round(rows.reduce((acc, item) => acc + item.avgFinal, 0) / rows.length) : 0,
        great: rows.filter((item) => item.rating === 'great').length,
        below: rows.filter((item) => item.rating === 'below').length,
        review: rows.filter((item) => item.status === 'review' || item.status === 'submitted').length,
      }))
      .sort((a, b) => b.avg - a.avg)
  }, [filtered])

  const bySpecialist = useMemo(() => {
    const map = new Map<string, Assessment[]>()
    filtered.forEach((item) => {
      map.set(item.spec, [...(map.get(item.spec) || []), item])
    })
    return [...map.entries()]
      .map(([specialist, rows]) => ({
        specialist,
        leader: rows[0]?.oce || rows[0]?.leaderScope || '',
        count: rows.length,
        avg: rows.length ? Math.round(rows.reduce((acc, item) => acc + item.avgFinal, 0) / rows.length) : 0,
        lastDate: [...rows].sort((a, b) => b.data.localeCompare(a.data))[0]?.data || '',
      }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 10)
  }, [filtered])

  const reportTable = useMemo(() => buildReportTable(filtered, mode), [filtered, mode])
  const reportPreviewRows = reportTable.rows.slice(0, 18)
  const activeAvg = filtered.length ? Math.round(filtered.reduce((acc, item) => acc + item.avgFinal, 0) / filtered.length) : 0
  const activeBelow = filtered.filter((item) => item.rating === 'below').length
  const activeGreat = filtered.filter((item) => item.rating === 'great').length
  const activeReview = filtered.filter((item) => item.status === 'review' || item.status === 'submitted').length
  const goalGap = activeAvg - 82

  const exportReadiness = [
    activeReview ? { label: 'Do decyzji', value: activeReview, hint: 'Karty do domknięcia review.' } : null,
    activeBelow ? { label: 'Poniżej standardu', value: activeBelow, hint: 'Lista do feedbacku i korekty.' } : null,
    activeGreat ? { label: 'Bardzo dobry', value: activeGreat, hint: 'Mocne przykłady do kalibracji.' } : null,
  ].filter(Boolean) as Array<{ label: string; value: number; hint: string }>

  const reportActions = [
    activeReview ? { label: 'Przejdź do ewidencji', hint: 'Domknij statusy submitted i review z tego zakresu.', action: () => openRegistry('decision'), icon: ClipboardCheck } : null,
    activeBelow ? { label: 'Przejdź do zespołu', hint: 'Wejdź do profili specjalistów z najsłabszymi wynikami.', action: () => setView('team'), icon: Users } : null,
    { label: 'Przejdź do dashboardu', hint: 'Zobacz trend i priorytety dla tego samego filtra.', action: () => setView('dashboard'), icon: TrendingUp },
  ].filter(Boolean) as Array<{ label: string; hint: string; action: () => void; icon: typeof ClipboardCheck }>

  function exportSpecialistPdf() {
    if (!filters.specialist || filters.specialist === 'all') return
    const exported = printSpecialistProfileReport(filters.specialist, filtered)
    setNotice(exported ? '' : 'Przeglądarka zablokowała okno drukowania lub PDF.')
    if (exported) {
      recordDiagnostic({
        scope: 'reports',
        action: 'print-profile',
        detail: `Profil specjalisty ${filters.specialist} (${filtered.filter((item) => item.spec === filters.specialist).length} kart)`,
        level: 'info',
      })
    }
  }

  return (
    <main className="screen">
      <AnalyticsFilterBar assessments={assessments} filters={filters} onChange={setFilters} />

      <section className="report-hero">
        <div className="report-hero-copy">
          <div className="section-title">
            <span>Raporty</span>
            <small>{filtered.length} kart po filtrach</small>
          </div>
          <h1>Najpierw ustaw filtr, potem pobierz tylko to, co pomaga podjąć decyzję.</h1>
          <p>{notice || reportTable.description}</p>
        </div>
        <div className="report-hero-actions">
          <button className="primary-btn" type="button" onClick={() => openRegistry('decision')}>
            <ClipboardCheck size={16} /> Przejdź do ewidencji
          </button>
          <span className="hint-text">Tryby, eksporty i tabele pomocnicze są niżej.</span>
        </div>
      </section>

      <section className="report-kpi-grid">
        <div className="metric-panel"><span>Średni wynik</span><strong>{activeAvg || '-'}</strong><small>w aktywnym filtrze</small></div>
        <div className="metric-panel"><span>Karty</span><strong>{filtered.length}</strong><small>aktywny zakres</small></div>
        <div className="metric-panel"><span>Poniżej standardu</span><strong>{activeBelow}</strong><small>wymagają reakcji</small></div>
        <div className="metric-panel"><span>Różnica do celu</span><strong>{goalGap ? `${goalGap >= 0 ? '+' : ''}${goalGap} pp` : '-'}</strong><small>progiem jest 82%</small></div>
      </section>

      <section className="report-ops-grid">
        <div className="data-panel">
          <div className="section-title"><span>Sygnały</span><small>kontekst bieżącego zestawu</small></div>
          {exportReadiness.length ? (
            <div className="action-priority-list">
              {exportReadiness.map((item) => (
                <div className="action-priority-card" key={item.label}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <small>{item.hint}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">Bieżący filtr nie pokazuje sygnałów wymagających pilnego komentarza.</div>
          )}
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
          ) : (
            <div className="empty-state">Brak danych dla aktualnego zestawu filtrów.</div>
          )}
          {reportTable.rows.length > reportPreviewRows.length ? <p className="hint-text">Pokazano pierwsze {reportPreviewRows.length} wiersze. Pełny zakres pobierzesz z eksportu.</p> : null}
        </div>
      </section>

      <details className="report-more" open={showMore} onToggle={(event) => setShowMore(event.currentTarget.open)}>
        <summary>
          <span>Narzędzia</span>
          <small>tryby, eksporty i rankingi</small>
        </summary>
        <div className="report-more-body">
          <section className="data-panel">
            <div className="section-title"><span>Format</span><small>wybierz jeden widok na raz</small></div>
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
              <button className="ghost-btn" type="button" onClick={() => { exportTableCsv(reportTable); recordDiagnostic({ scope: 'reports', action: 'export', detail: `CSV ${reportTable.rows.length} wierszy`, level: 'info' }) }}>
                <Download size={16} /> Eksport CSV
              </button>
              <button className="ghost-btn" type="button" onClick={() => { void exportTableExcel(reportTable); recordDiagnostic({ scope: 'reports', action: 'export', detail: `XLSX ${reportTable.rows.length} wierszy`, level: 'info' }) }}>
                <Download size={16} /> Eksport XLSX
              </button>
              <button className="ghost-btn" type="button" onClick={() => { exportJson(filtered); recordDiagnostic({ scope: 'reports', action: 'export', detail: `JSON ${filtered.length} kart`, level: 'info' }) }}>
                <Download size={16} /> Karty JSON
              </button>
              {filters.specialist !== 'all' ? (
                <button className="ghost-btn" type="button" onClick={exportSpecialistPdf}>
                  <FileText size={16} /> Raport PDF specjalisty
                </button>
              ) : null}
            </div>
          </section>

          <section className="report-action-grid">
            <article className="data-panel">
              <div className="section-title"><span>Następny krok</span><small>na podstawie aktywnego filtra</small></div>
              <div className="report-action-list">
                {reportActions.map((item) => (
                  <button className="report-action-card" key={item.label} type="button" onClick={item.action}>
                    <strong><item.icon size={16} /> {item.label}</strong>
                    <span>{item.hint}</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="data-panel">
              <div className="section-title"><span>Szybki dostęp</span><small>{bySpecialist.length ? 'najniższe średnie w filtrze' : 'brak danych'}</small></div>
              <div className="report-specialist-shortlist">
                {bySpecialist.slice(0, 6).map((item) => (
                  <button className="report-specialist-card" key={item.specialist} type="button" onClick={() => setSelectedSpecialistProfile(item.specialist)}>
                    <div>
                      <strong>{item.specialist}</strong>
                      <span>{item.leader || 'Brak lidera'} - {item.lastDate || 'Brak daty'}</span>
                    </div>
                    <span className={scoreClass(item.avg)}>{item.avg}%</span>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="data-panel">
            <div className="section-title">
              <span>Liderzy</span>
              <small>agregacja w bieżącym filtrze</small>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lider</th>
                    <th>Karty</th>
                    <th>Średnia</th>
                    <th>Bardzo dobry</th>
                    <th>Poniżej standardu</th>
                    <th>Do decyzji</th>
                  </tr>
                </thead>
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
            <div className="section-title"><span>Najniższe średnie</span><small>najsłabsze średnie w filtrze</small></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Specjalista</th>
                    <th>Lider</th>
                    <th>Karty</th>
                    <th>Średnia</th>
                    <th>Ostatnia karta</th>
                    <th>Profil</th>
                  </tr>
                </thead>
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
        </div>
      </details>

      {selectedSpecialistProfile ? (
        <SpecialistProfileModal
          specialist={selectedSpecialistProfile}
          assessments={filtered}
          onStartAssessment={() => onStartAssessmentForSpecialist?.(selectedSpecialistProfile)}
          onClose={() => setSelectedSpecialistProfile(null)}
        />
      ) : null}
    </main>
  )
}

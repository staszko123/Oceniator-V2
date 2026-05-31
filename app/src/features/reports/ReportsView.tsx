import { useMemo, useState } from 'react'
import { ClipboardCheck, Download, Eye, FileText, TrendingUp, Users } from 'lucide-react'
import { AnalyticsFilterBar } from '../analytics/shared'
import { applyAnalyticsFilters, defaultAnalyticsFilters } from '../analytics/filters'
import { recordDiagnostic } from '../../domain/diagnostics'
import { scoreClass } from '../../lib/display'
import { downloadFile } from '../../lib/fileExport'
import { buildReportTable, exportTableCsv, exportTableExcel, type ReportMode } from './reporting'
import { SpecialistProfileModal } from '../specialists/profile'
import { printSpecialistProfileReport } from '../specialists/profileData'
import type { Assessment } from '../../domain/types'
import { useLanguage } from '../../i18n/LanguageContext'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

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
  const { t } = useLanguage()
  const [filters, setFilters] = useState(() => defaultAnalyticsFilters())
  const [mode, setMode] = useState<ReportMode>('summary')
  const [selectedSpecialistProfile, setSelectedSpecialistProfile] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [showMore, setShowMore] = useState(true)

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
  const reportHighlights = [
    { label: t('report.avgScore', 'Średni wynik'), value: activeAvg ? `${activeAvg}%` : '-', tone: 'positive' as const },
    { label: t('report.cards', 'Karty'), value: String(filtered.length), tone: 'neutral' as const },
    { label: t('registry.onlyDecision', 'Do decyzji'), value: String(activeReview), tone: 'alert' as const },
    { label: t('report.belowStandard', 'Poniżej standardu'), value: String(activeBelow), tone: 'risk' as const },
  ]

  const exportReadiness = [
    activeReview ? { label: t('registry.onlyDecision', 'Do decyzji'), value: activeReview, hint: t('report.reviewHint', 'Karty do domknięcia weryfikacji.') } : null,
    activeBelow ? { label: t('report.belowStandard', 'Poniżej standardu'), value: activeBelow, hint: t('report.belowHint', 'Lista do feedbacku i korekty.') } : null,
    activeGreat ? { label: t('report.great', 'Bardzo dobry'), value: activeGreat, hint: t('report.greatHint', 'Mocne przykłady do kalibracji.') } : null,
  ].filter(Boolean) as Array<{ label: string; value: number; hint: string }>

  const reportActions = [
    activeReview ? { label: t('report.goRegistry', 'Przejdź do ewidencji'), hint: t('report.registryHint', 'Domknij statusy do weryfikacji z tego zakresu.'), action: () => openRegistry('decision'), icon: ClipboardCheck } : null,
    activeBelow ? { label: t('report.goTeam', 'Przejdź do zespołu'), hint: t('report.teamHint', 'Wejdź do profili specjalistów z najsłabszymi wynikami.'), action: () => setView('team'), icon: Users } : null,
    { label: t('report.goDashboard', 'Przejdź do analityki'), hint: t('report.dashboardHint', 'Zobacz trend i priorytety dla tego samego filtra.'), action: () => setView('dashboard'), icon: TrendingUp },
  ].filter(Boolean) as Array<{ label: string; hint: string; action: () => void; icon: typeof ClipboardCheck }>

  function exportSpecialistPdf() {
    if (!filters.specialist || filters.specialist === 'all') return
    const exported = printSpecialistProfileReport(filters.specialist, filtered)
    setNotice(exported ? '' : t('report.printBlocked', 'Przeglądarka zablokowała okno drukowania lub PDF.'))
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
            <span>{t('report.title', 'Raporty')}</span>
            <small>{filtered.length} {t('report.cardsAfterFilters', 'kart po filtrach')}</small>
          </div>
          <h1>{t('report.entryHint', 'Szybkie podsumowanie, eksport i następny krok dla bieżącego filtra.')}</h1>
          <p>{notice || reportTable.description}</p>
          <div className="report-highlight-row">
            {reportHighlights.map((item) => (
              <div className={`report-highlight tone-${item.tone}`} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="report-hero-actions">
          <button className="primary-btn" type="button" onClick={() => openRegistry('decision')}>
            <ClipboardCheck size={16} /> {t('report.goRegistry', 'Przejdź do ewidencji')}
          </button>
          <div className="report-hero-secondary">
            <button className="ghost-btn" type="button" onClick={() => setView('dashboard')}>
              <TrendingUp size={16} /> {t('report.goDashboard', 'Przejdź do analityki')}
            </button>
            <span className="hint-text">{t('report.toolsHint', 'Eksporty i tabele pomocnicze są niżej.')}</span>
          </div>
        </div>
      </section>

      <section className="report-kpi-grid">
        <div className="metric-panel"><span>{t('report.avgScore', 'Średni wynik')}</span><strong>{activeAvg || '-'}</strong><small>{t('report.inFilter', 'w aktywnym filtrze')}</small></div>
        <div className="metric-panel"><span>{t('report.cards', 'Karty')}</span><strong>{filtered.length}</strong><small>{t('report.activeRange', 'aktywny zakres')}</small></div>
        <div className="metric-panel"><span>{t('report.belowStandard', 'Poniżej standardu')}</span><strong>{activeBelow}</strong><small>{t('report.needsAction', 'wymagają reakcji')}</small></div>
        <div className="metric-panel"><span>{t('report.goalGap', 'Różnica do celu')}</span><strong>{goalGap ? `${goalGap >= 0 ? '+' : ''}${goalGap} pp` : '-'}</strong><small>{t('report.goalThreshold', 'progiem jest 82%')}</small></div>
      </section>

      <section className="report-ops-grid">
        <div className="data-panel">
          <div className="section-title"><span>{t('report.signals', 'Sygnały')}</span><small>{t('report.currentContext', 'kontekst bieżącego zestawu')}</small></div>
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
            <div className="empty-state compact-empty">{t('report.noSignals', 'Bieżący filtr nie pokazuje sygnałów wymagających pilnego komentarza.')}</div>
          )}
        </div>

        <div className="report-preview-panel">
          <div className="section-title"><span>{reportTable.title}</span><small>{reportTable.rows.length} {t('report.resultRows', 'wierszy wynikowych')}</small></div>
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
            <div className="empty-state">{t('report.empty', 'Brak danych dla aktualnego zestawu filtrów.')}</div>
          )}
          {reportTable.rows.length > reportPreviewRows.length ? <p className="hint-text">{t('report.previewHint', 'Pokazano pierwsze {count} wiersze. Pełny zakres pobierzesz z eksportu.').replace('{count}', String(reportPreviewRows.length))}</p> : null}
        </div>
      </section>

      <details className="report-more" open={showMore} onToggle={(event) => setShowMore(event.currentTarget.open)}>
        <summary>
          <span>{t('report.tools', 'Narzędzia raportu')}</span>
          <small>{t('report.toolsSubtitle', 'tryby, eksporty i rankingi')}</small>
        </summary>
        <div className="report-more-body">
          <section className="data-panel">
            <div className="section-title"><span>{t('report.format', 'Format')}</span><small>{t('report.oneMode', 'wybierz jeden widok na raz')}</small></div>
            <div className="report-mode-group">
              <button className={mode === 'detail' ? 'active' : ''} type="button" onClick={() => setMode('detail')}>
                <FileText size={15} /> {t('report.detail', 'Szczegółowy')}
              </button>
              <button className={mode === 'summary' ? 'active' : ''} type="button" onClick={() => setMode('summary')}>
                <Users size={15} /> {t('report.specialists', 'Specjaliści')}
              </button>
              <button className={mode === 'trend' ? 'active' : ''} type="button" onClick={() => setMode('trend')}>
                <TrendingUp size={15} /> {t('report.trends', 'Trendy')}
              </button>
            </div>
            <div className="report-actions">
              <button className="ghost-btn" type="button" onClick={() => { exportTableCsv(reportTable); recordDiagnostic({ scope: 'reports', action: 'export', detail: `CSV ${reportTable.rows.length} wierszy`, level: 'info' }) }}>
                <Download size={16} /> {t('report.exportCsv', 'Pobierz CSV')}
              </button>
              <button className="ghost-btn" type="button" onClick={() => { void exportTableExcel(reportTable); recordDiagnostic({ scope: 'reports', action: 'export', detail: `XLSX ${reportTable.rows.length} wierszy`, level: 'info' }) }}>
                <Download size={16} /> {t('report.exportXlsx', 'Pobierz XLSX')}
              </button>
              <button className="ghost-btn" type="button" onClick={() => { exportJson(filtered); recordDiagnostic({ scope: 'reports', action: 'export', detail: `JSON ${filtered.length} kart`, level: 'info' }) }}>
                <Download size={16} /> {t('report.exportJson', 'Pobierz JSON')}
              </button>
              {filters.specialist !== 'all' ? (
                <button className="ghost-btn" type="button" onClick={exportSpecialistPdf}>
                  <FileText size={16} /> {t('report.specialistPdf', 'Pobierz raport specjalisty')}
                </button>
              ) : null}
            </div>
          </section>

          <section className="report-action-grid">
            <article className="data-panel">
              <div className="section-title"><span>{t('report.nextStep', 'Następny krok')}</span><small>{t('report.nextStepHint', 'na podstawie aktywnego filtra')}</small></div>
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
              <div className="section-title"><span>{t('report.quickAccess', 'Szybki dostęp')}</span><small>{bySpecialist.length ? t('report.lowestInFilter', 'najniższe średnie w filtrze') : t('report.noDataShort', 'brak danych')}</small></div>
              <div className="report-specialist-shortlist">
                {bySpecialist.slice(0, 6).map((item) => (
                  <button className="report-specialist-card" key={item.specialist} type="button" onClick={() => setSelectedSpecialistProfile(item.specialist)}>
                    <div>
                      <strong>{item.specialist}</strong>
                      <span>{item.leader || t('report.noLeader', 'Brak lidera')} - {item.lastDate || t('report.noDate', 'Brak daty')}</span>
                    </div>
                    <span className={scoreClass(item.avg)}>{item.avg}%</span>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="data-panel">
            <div className="section-title">
              <span>{t('report.leaders', 'Liderzy')}</span>
              <small>{t('report.groupedInFilter', 'agregacja w bieżącym filtrze')}</small>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('report.leader', 'Lider')}</th>
                    <th>{t('report.cards', 'Karty')}</th>
                    <th>{t('report.avgScore', 'Średnia')}</th>
                    <th>{t('report.great', 'Bardzo dobry')}</th>
                    <th>{t('report.belowStandard', 'Poniżej standardu')}</th>
                    <th>{t('registry.onlyDecision', 'Do decyzji')}</th>
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
            <div className="section-title"><span>{t('report.lowestAverages', 'Najniższe średnie')}</span><small>{t('report.lowestInFilter', 'najsłabsze średnie w filtrze')}</small></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('table.specialist', 'Specjalista')}</th>
                    <th>{t('report.leader', 'Lider')}</th>
                    <th>{t('report.cards', 'Karty')}</th>
                    <th>{t('report.avgScore', 'Średnia')}</th>
                    <th>{t('report.lastCard', 'Ostatnia karta')}</th>
                    <th>{t('report.profile', 'Profil')}</th>
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
                          <Eye size={15} /> {t('report.profile', 'Profil')}
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

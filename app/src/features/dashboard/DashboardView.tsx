import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download, Eye, EyeOff, GripVertical, LayoutDashboard, Maximize2, RotateCcw, Settings, TrendingUp, Trophy } from 'lucide-react'
import { TYPE_LABELS } from '../../domain/defs'
import type { AdminConfig, Assessment, AssessmentType } from '../../domain/types'
import { AnalyticsFilterBar } from '../analytics/shared'
import { applyAnalyticsFilters, defaultAnalyticsFilters, type AnalyticsFilters } from '../analytics/filters'
import {
  dashboardLeaderRanking,
  dashboardPanelLabels,
  dashboardTrend,
  defaultDashboardPanelOrder,
  readDashboardPrefs,
  sectionBreakdown,
  weakestCriteria,
  writeDashboardPrefs,
  type DashboardPanelKey,
} from './utils'

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

function DashboardWidget({
  panel,
  title,
  subtitle,
  children,
  onHide,
  onDragStart,
  onDrop,
}: {
  panel: DashboardPanelKey
  title: string
  subtitle: string
  children: React.ReactNode
  onHide: (panel: DashboardPanelKey) => void
  onDragStart: (panel: DashboardPanelKey) => void
  onDrop: (panel: DashboardPanelKey) => void
}) {
  return (
    <section
      className="chart-panel dashboard-widget"
      draggable
      onDragStart={() => onDragStart(panel)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(panel)}
    >
      <div className="widget-head">
        <button className="drag-handle" type="button" title="Przeciagnij panel"><GripVertical size={16} /></button>
        <div className="section-title"><span>{title}</span><small>{subtitle}</small></div>
        <button className="widget-icon-btn" type="button" onClick={() => onHide(panel)} title="Ukryj panel"><EyeOff size={15} /></button>
      </div>
      {children}
    </section>
  )
}

export default function DashboardView({
  assessments,
  goals,
  renderAssessmentTable,
}: {
  assessments: Assessment[]
  goals: AdminConfig['goals']
  renderAssessmentTable: (rows: Assessment[]) => React.ReactNode
}) {
  const [filters, setFilters] = useState<AnalyticsFilters>(() => defaultAnalyticsFilters())
  const [prefs, setPrefs] = useState(() => readDashboardPrefs())
  const [dragging, setDragging] = useState<DashboardPanelKey | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const active = useMemo(() => applyAnalyticsFilters(assessments, filters), [assessments, filters])
  const avg = active.length ? Math.round(active.reduce((acc, item) => acc + item.avgFinal, 0) / active.length) : 0
  const greatShare = active.length ? Math.round(active.filter((item) => item.rating === 'great').length / active.length * 100) : 0
  const belowCount = active.filter((item) => item.rating === 'below').length
  const reviewCount = active.filter((item) => item.status === 'review' || item.status === 'submitted').length
  const goalGap = avg ? avg - goals.minAvg : 0
  const byType = (Object.keys(TYPE_LABELS) as AssessmentType[]).map((type) => ({
    type,
    rows: active.filter((item) => item.type === type),
  }))
  const sections = sectionBreakdown(active)
  const weak = weakestCriteria(active)
  const trend = useMemo(() => dashboardTrend(active), [active])
  const leaders = useMemo(() => dashboardLeaderRanking(active), [active])
  const visiblePanels = prefs.order.filter((item) => !prefs.hidden.includes(item))
  const allPanelsHidden = visiblePanels.length === 0

  useEffect(() => {
    writeDashboardPrefs(prefs)
  }, [prefs])

  function updatePrefs(next: Partial<typeof prefs>) {
    setPrefs((current) => ({ ...current, ...next }))
  }

  function movePanel(target: DashboardPanelKey) {
    if (!dragging || dragging === target) return
    setPrefs((current) => {
      const next = current.order.filter((item) => item !== dragging)
      const targetIndex = next.indexOf(target)
      next.splice(targetIndex, 0, dragging)
      return { ...current, order: next }
    })
    setDragging(null)
  }

  function hidePanel(panel: DashboardPanelKey) {
    setPrefs((current) => ({ ...current, hidden: [...new Set([...current.hidden, panel])] }))
  }

  function showPanel(panel: DashboardPanelKey) {
    setPrefs((current) => ({ ...current, hidden: current.hidden.filter((item) => item !== panel) }))
  }

  function togglePanel(panel: DashboardPanelKey) {
    setPrefs((current) => {
      const hidden = current.hidden.includes(panel)
        ? current.hidden.filter((item) => item !== panel)
        : [...current.hidden, panel]
      return { ...current, hidden }
    })
  }

  function shiftPanel(panel: DashboardPanelKey, direction: -1 | 1) {
    setPrefs((current) => {
      const index = current.order.indexOf(panel)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= current.order.length) return current
      const order = [...current.order]
      const [item] = order.splice(index, 1)
      order.splice(targetIndex, 0, item)
      return { ...current, order }
    })
  }

  function resetDashboard() {
    setPrefs({ order: defaultDashboardPanelOrder, hidden: [], density: 'comfortable', layout: 'grid' })
  }

  function exportDashboardCsv() {
    const summary = [
      ['Metryka', 'Wartosc'],
      ['Sredni wynik', `${avg || 0}%`],
      ['Cel sredniej', `${goals.minAvg}%`],
      ['Bardzo dobry', `${greatShare}%`],
      ['Karty aktywne', active.length],
      ['Ponizej standardu', belowCount],
      ['Kolejka decyzyjna', reviewCount],
      ['Filtr okresu', filters.period],
      ['Filtr typu', filters.type],
      ['Filtr lidera', filters.leader],
      ['Filtr specjalisty', filters.specialist],
    ]
    const trendRows = [['Okres', 'Karty', 'Srednia', 'Ponizej standardu', 'Do decyzji'], ...trend.map((item) => [item.period, item.count, `${item.avg}%`, item.below, item.review])]
    const leaderRows = [['Lider', 'Karty', 'Srednia', 'Ponizej standardu', 'Do decyzji'], ...leaders.map((item) => [item.leader, item.count, `${item.avg}%`, item.below, item.review])]
    const weakRows = [['Kryterium', 'Srednia', 'Liczba ocen'], ...weak.map((item) => [item.label, `${item.avg}%`, item.count])]
    const blocks = [
      ['Podsumowanie dashboardu'],
      ...summary,
      [],
      ['Trend okresowy'],
      ...trendRows,
      [],
      ['Ranking liderow'],
      ...leaderRows,
      [],
      ['Slabe kryteria'],
      ...weakRows,
    ]
    const csv = `\uFEFF${blocks.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
    downloadFile('oceniator-dashboard.csv', 'text/csv;charset=utf-8', csv)
  }

  function dashboardDiagnostics() {
    let storage = 'dostepny'
    try {
      localStorage.setItem('oc_v2_diag_probe', '1')
      localStorage.removeItem('oc_v2_diag_probe')
    } catch {
      storage = 'zablokowany'
    }
    return [
      ['Tryb danych', assessments.length ? 'aktywny' : 'brak kart'],
      ['Karty po filtrze', String(active.length)],
      ['Wszystkie karty w zakresie', String(assessments.length)],
      ['Widoczne widzety', String(visiblePanels.length)],
      ['Ukryte widzety', String(prefs.hidden.length)],
      ['LocalStorage', storage],
    ]
  }

  function renderPanel(panel: DashboardPanelKey) {
    if (panel === 'trend') {
      const maxCount = Math.max(...trend.map((item) => item.count), 1)
      return (
        <DashboardWidget panel={panel} title="Trend okresowy" subtitle="wolumen, wynik i ryzyko" onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel}>
          <div className="trend-chart">
            {trend.map((item) => (
              <div className="trend-column" key={item.period}>
                <div className="trend-meta">
                  <strong>{item.avg}%</strong>
                  <span>{item.count} kart</span>
                </div>
                <div className="trend-bar" style={{ ['--bar-height' as string]: `${Math.max(10, item.count / maxCount * 100)}%` }}>
                  <i />
                </div>
                <div className="trend-label">
                  <span>{item.period}</span>
                  <small>{item.below} nisko · {item.review} decyzji</small>
                </div>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )
    }
    if (panel === 'typeMix') {
      return (
        <DashboardWidget panel={panel} title="Rozklad wg typu" subtitle="udzial w aktywnym filtrze" onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel}>
          <div className="type-orbit">
            {byType.map(({ type, rows }, index) => {
              const value = active.length ? Math.round(rows.length / active.length * 100) : 0
              return (
                <div className="type-orbit-item" key={type} style={{ ['--accent-index' as string]: index }}>
                  <div>
                    <span>{TYPE_LABELS[type]}</span>
                    <strong>{rows.length}</strong>
                  </div>
                  <div className="orbit-track"><i style={{ width: `${value}%` }} /></div>
                  <small>{value}% portfela</small>
                </div>
              )
            })}
          </div>
        </DashboardWidget>
      )
    }
    if (panel === 'sections') {
      return (
        <DashboardWidget panel={panel} title="Sekcje jakosci" subtitle="od najslabszej" onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel}>
          {sections.slice(0, 8).map((item, index) => (
            <div className="bar-row rich" key={item.label} style={{ ['--row-index' as string]: index }}>
              <span>{item.label}</span>
              <div><i style={{ width: `${item.avg}%` }} /></div>
              <strong>{item.avg}%</strong>
            </div>
          ))}
        </DashboardWidget>
      )
    }
    if (panel === 'weak') {
      return (
        <DashboardWidget panel={panel} title="Slabe kryteria" subtitle="kolejka coachingowa" onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel}>
          <div className="weak-list enhanced">
            {weak.map((item) => (
              <div className="weak-item" key={item.label}>
                <span>{item.label}</span>
                <strong className={scoreClass(item.avg)}>{item.avg}%</strong>
                <small>{item.count} ocen czastkowych</small>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )
    }
    if (panel === 'leaders') {
      return (
        <DashboardWidget panel={panel} title="Ranking liderow" subtitle="srednia i kolejka decyzji" onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel}>
          <div className="leader-board">
            {leaders.map((item, index) => (
              <div className="leader-row" key={item.leader}>
                <div className="leader-rank">{index < 3 ? <Trophy size={15} /> : index + 1}</div>
                <div>
                  <strong>{item.leader}</strong>
                  <span>{item.count} kart · {item.review} do decyzji · {item.below} nisko</span>
                </div>
                <span className={scoreClass(item.avg)}>{item.avg}%</span>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )
    }
    return (
      <DashboardWidget panel={panel} title="Najpilniejsze karty" subtitle="niskie wyniki i weryfikacja" onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel}>
        {renderAssessmentTable([...active].sort((a, b) => a.avgFinal - b.avgFinal).slice(0, 8))}
      </DashboardWidget>
    )
  }

  return (
    <main className={`screen dashboard-screen density-${prefs.density} layout-${prefs.layout}`}>
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="section-title"><span>Dashboard jakosci</span><small>{active.length} kart w aktywnym filtrze</small></div>
          <h1>Interaktywny pulpit wynikow, celow i ryzyk zespolu.</h1>
          <p className="hint-text">Przeciagaj sekcje za uchwyt, ukrywaj mniej potrzebne widzety i przelaczaj gestosc ukladu. Preferencje zapisza sie lokalnie.</p>
        </div>
        <div className="quality-ring" style={{ ['--score' as string]: `${avg || 0}%` }}>
          <div>
            <strong>{avg || '-'}%</strong>
            <span>cel {goals.minAvg}%</span>
          </div>
        </div>
        <div className="dashboard-pulse">
          <span><TrendingUp size={14} /> {goalGap >= 0 ? 'Ponad celem' : 'Pod celem'}</span>
          <strong>{avg ? `${goalGap >= 0 ? '+' : ''}${goalGap} pp` : '-'}</strong>
          <small>{reviewCount} kart w kolejce decyzyjnej</small>
        </div>
      </section>
      <AnalyticsFilterBar assessments={assessments} filters={filters} onChange={setFilters} />
      <section className="dashboard-controls">
        <div className="dashboard-toggle-group">
          <button className={prefs.layout === 'grid' ? 'active' : ''} type="button" onClick={() => updatePrefs({ layout: 'grid' })}><LayoutDashboard size={15} /> Siatka</button>
          <button className={prefs.layout === 'focus' ? 'active' : ''} type="button" onClick={() => updatePrefs({ layout: 'focus' })}><Maximize2 size={15} /> Fokus</button>
        </div>
        <div className="dashboard-toggle-group">
          <button className={prefs.density === 'comfortable' ? 'active' : ''} type="button" onClick={() => updatePrefs({ density: 'comfortable' })}>Komfort</button>
          <button className={prefs.density === 'compact' ? 'active' : ''} type="button" onClick={() => updatePrefs({ density: 'compact' })}>Kompakt</button>
        </div>
        {prefs.hidden.length ? (
          <div className="dashboard-hidden">
            {prefs.hidden.map((panel) => <button key={panel} type="button" onClick={() => showPanel(panel)}>{dashboardPanelLabels[panel]}</button>)}
          </div>
        ) : null}
        <button className="ghost-btn" type="button" onClick={resetDashboard}><RotateCcw size={15} /> Reset ukladu</button>
        <button className="ghost-btn" type="button" onClick={exportDashboardCsv}><Download size={15} /> Eksport CSV</button>
        <button className="ghost-btn" type="button" onClick={() => setShowDiagnostics((value) => !value)}><Settings size={15} /> Diagnostyka</button>
      </section>
      {showDiagnostics ? (
        <section className="dashboard-diagnostics">
          {dashboardDiagnostics().map(([label, value]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
        </section>
      ) : null}
      <section className="dashboard-config">
        <div className="section-title"><span>Konfiguracja widzetow</span><small>kolejnosc i widocznosc</small></div>
        <div className="widget-config-list">
          {prefs.order.map((panel, index) => {
            const isHidden = prefs.hidden.includes(panel)
            return (
              <div className={isHidden ? 'widget-config-row muted' : 'widget-config-row'} key={panel}>
                <button className="widget-toggle" type="button" onClick={() => togglePanel(panel)}>
                  {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                  {dashboardPanelLabels[panel]}
                </button>
                <div>
                  <button type="button" disabled={index === 0} onClick={() => shiftPanel(panel, -1)} title="Przesun wyzej"><ChevronUp size={15} /></button>
                  <button type="button" disabled={index === prefs.order.length - 1} onClick={() => shiftPanel(panel, 1)} title="Przesun nizej"><ChevronDown size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <section className="dashboard-grid kpi-grid">
        <div className="metric-panel premium"><span>Sredni wynik</span><strong>{avg || '-'}%</strong><small>cel {goals.minAvg}%</small></div>
        <div className="metric-panel premium"><span>Bardzo dobry</span><strong>{greatShare}%</strong><small>cel {goals.greatShare}% udzialu</small></div>
        <div className="metric-panel premium"><span>Karty</span><strong>{active.length}</strong><small>aktywny zakres</small></div>
        <div className="metric-panel premium"><span>Ponizej standardu</span><strong>{belowCount}</strong><small>wymaga reakcji</small></div>
      </section>
      <div className="analytics-grid movable-grid">
        {allPanelsHidden ? (
          <section className="empty-dashboard">
            <Settings size={34} />
            <h3>Wszystkie widzety sa ukryte</h3>
            <p>Przywroc wybrane panele w konfiguracji albo zresetuj caly uklad dashboardu.</p>
            <button className="primary-btn" type="button" onClick={resetDashboard}><RotateCcw size={15} /> Przywroc domyslny uklad</button>
          </section>
        ) : visiblePanels.map((panel) => renderPanel(panel))}
      </div>
    </main>
  )
}

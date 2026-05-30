import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download, Eye, EyeOff, GripVertical, LayoutDashboard, Maximize2, RotateCcw, Settings, Trophy } from 'lucide-react'
import { TYPE_LABELS } from '../../domain/defs'
import { canCompareLeadersRole } from '../../domain/access'
import type { AdminConfig, Assessment, AssessmentType, Role } from '../../domain/types'
import { scoreClass } from '../../lib/display'
import { useLanguage } from '../../i18n/LanguageContext'
import { AnalyticsFilterBar } from '../analytics/shared'
import { applyAnalyticsFilters, defaultAnalyticsFilters, type AnalyticsFilters } from '../analytics/filters'
import { dashboardPanelConfig } from '../../config/dashboard'
import {
  dashboardLeaderRanking,
  dashboardTrend,
  defaultDashboardPanelOrder,
  sectionBreakdown,
  weakestCriteria,
  type DashboardPrefs,
  type DashboardPanelKey,
} from './utils'
import { canUsePersistentStorage } from '../../utils/storage'
import { AssessmentTable } from '../registry/AssessmentTable'

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

function DashboardWidget({
  panel,
  title,
  subtitle,
  children,
  onHide,
  onDragStart,
  onDrop,
  t,
}: {
  panel: DashboardPanelKey
  title: string
  subtitle: string
  children: React.ReactNode
  onHide: (panel: DashboardPanelKey) => void
  onDragStart: (panel: DashboardPanelKey) => void
  onDrop: (panel: DashboardPanelKey) => void
  t: (key: string, fallback?: string) => string
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
        <button className="drag-handle" type="button" title={t('dashboard.widget.drag', 'Przeciągnij panel')}><GripVertical size={16} /></button>
        <div className="section-title"><span>{title}</span><small>{subtitle}</small></div>
        <button className="widget-icon-btn" type="button" onClick={() => onHide(panel)} title={t('dashboard.widget.hidden', 'Ukryj panel')}><EyeOff size={15} /></button>
      </div>
      {children}
    </section>
  )
}

export default function DashboardView({
  userRole,
  assessments,
  goals,
  prefs,
  onPrefsChange,
  setView,
  openRegistry,
}: {
  userRole: Role
  assessments: Assessment[]
  goals: AdminConfig['goals']
  prefs: DashboardPrefs
  onPrefsChange: (prefs: DashboardPrefs) => void | Promise<void>
  setView: (view: ViewKey) => void
  openRegistry: (preset?: 'all' | 'decision' | 'recent' | 'edited') => void
}) {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<AnalyticsFilters>(() => defaultAnalyticsFilters())
  const [dragging, setDragging] = useState<DashboardPanelKey | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [showMore, setShowMore] = useState(false)
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
  const canCompareLeaders = canCompareLeadersRole(userRole)
  const reviewItems = [...active]
    .filter((item) => item.status === 'submitted' || item.status === 'review')
    .sort((a, b) => a.avgFinal - b.avgFinal)
    .slice(0, 6)
  const visiblePanels = prefs.order.filter((item) => !prefs.hidden.includes(item) && (canCompareLeaders || item !== 'leaders'))
  const extraPanels = visiblePanels.filter((item) => item !== 'trend' && item !== 'lowScores')

  const dashboardPriorities = [
    reviewCount ? { label: t('registry.onlyDecision', 'Do decyzji'), value: reviewCount, hint: t('dashboard.priorityReviewHint', 'Najpierw domknij submitted i review.'), tone: 'alert', suffix: '', action: () => openRegistry('decision') } : null,
    belowCount ? { label: t('dashboard.belowStandard', 'Poniżej standardu'), value: belowCount, hint: t('dashboard.priorityBelowHint', 'To naturalna lista do feedbacku i kalibracji.'), tone: 'risk', suffix: '', action: () => setView('team') } : null,
    goalGap < 0 ? { label: t('dashboard.belowGoal', 'Pod celem'), value: Math.abs(goalGap), hint: t('dashboard.priorityGoalHint', 'Średnia jest poniżej celu o tyle punktów procentowych.'), tone: 'risk', suffix: ' pp', action: () => setView('reports') } : null,
    active.length ? { label: t('dashboard.greatShare', 'Bardzo dobry'), value: greatShare, hint: t('dashboard.priorityGreatHint', `Udział wysokich wyników w aktywnym filtrze. Cel ${goals.greatShare}%.`), tone: 'positive', suffix: '%', action: () => setView('reports') } : null,
  ].filter(Boolean) as Array<{ label: string; value: number; hint: string; tone: 'alert' | 'risk' | 'positive'; suffix: string; action: () => void }>

  const panelLabel = (panel: DashboardPanelKey) => t(dashboardPanelConfig[panel].labelKey, dashboardPanelConfig[panel].labelKey)
  const panelSubtitle = (panel: DashboardPanelKey) => t(dashboardPanelConfig[panel].subtitleKey, dashboardPanelConfig[panel].subtitleKey)

  function updatePrefs(next: Partial<DashboardPrefs>) {
    void onPrefsChange({
      ...prefs,
      ...next,
      order: next.order ?? prefs.order,
      hidden: next.hidden ?? prefs.hidden,
      density: next.density ?? prefs.density,
      layout: next.layout ?? prefs.layout,
    })
  }

  function movePanel(target: DashboardPanelKey) {
    if (!dragging || dragging === target) return
    const next = prefs.order.filter((item) => item !== dragging)
    const targetIndex = next.indexOf(target)
    next.splice(targetIndex, 0, dragging)
    updatePrefs({ order: next })
    setDragging(null)
  }

  function hidePanel(panel: DashboardPanelKey) {
    updatePrefs({ hidden: [...new Set([...prefs.hidden, panel])] })
  }

  function showPanel(panel: DashboardPanelKey) {
    updatePrefs({ hidden: prefs.hidden.filter((item) => item !== panel) })
  }

  function togglePanel(panel: DashboardPanelKey) {
    const hidden = prefs.hidden.includes(panel)
      ? prefs.hidden.filter((item) => item !== panel)
      : [...prefs.hidden, panel]
    updatePrefs({ hidden })
  }

  function shiftPanel(panel: DashboardPanelKey, direction: -1 | 1) {
    const index = prefs.order.indexOf(panel)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= prefs.order.length) return
    const order = [...prefs.order]
    const [item] = order.splice(index, 1)
    order.splice(targetIndex, 0, item)
    updatePrefs({ order })
  }

  function resetDashboard() {
    updatePrefs({ order: defaultDashboardPanelOrder, hidden: [], density: 'comfortable', layout: 'grid' })
  }

  function exportDashboardCsv() {
    const summary = [
      [t('dashboard.metric', 'Metryka'), t('dashboard.value', 'Wartość')],
      [t('dashboard.avgScore'), `${avg || 0}%`],
      [t('dashboard.goal', 'Cel średniej'), `${goals.minAvg}%`],
      [t('dashboard.greatShare'), `${greatShare}%`],
      [t('dashboard.cards'), active.length],
      [t('dashboard.belowStandard'), belowCount],
      [t('dashboard.decisionQueue', 'Kolejka decyzyjna'), reviewCount],
      [t('dashboard.filter.period', 'Filtr okresu'), filters.period],
      [t('dashboard.filter.type', 'Filtr typu'), filters.type],
      [t('dashboard.filter.leader', 'Filtr lidera'), filters.leader],
      [t('dashboard.filter.specialist', 'Filtr specjalisty'), filters.specialist],
    ]
    const trendRows = [[t('dashboard.period', 'Okres'), t('dashboard.cards'), t('dashboard.avgScore'), t('dashboard.belowStandard'), t('registry.onlyDecision', 'Do decyzji')], ...trend.map((item) => [item.period, item.count, `${item.avg}%`, item.below, item.review])]
    const weakRows = [[t('dashboard.criterion', 'Kryterium'), t('dashboard.avgScore'), t('dashboard.evals', 'Liczba ocen')], ...weak.map((item) => [item.label, `${item.avg}%`, item.count])]
    const blocks = [
      [t('dashboard.summaryTitle', 'Podsumowanie dashboardu')],
      ...summary,
      [],
      [t('dashboard.trendTitle', 'Trend okresowy')],
      ...trendRows,
      [],
      canCompareLeaders ? [t('dashboard.leaders', 'Ranking liderów')] : [t('dashboard.priorities', 'Priorytety kart')],
      ...(canCompareLeaders
        ? [[t('dashboard.leader', 'Lider'), t('dashboard.cards'), t('dashboard.avgScore'), t('dashboard.belowStandard'), t('registry.onlyDecision', 'Do decyzji')], ...leaders.map((item) => [item.leader, item.count, `${item.avg}%`, item.below, item.review])]
        : [[t('table.specialist', 'Specjalista'), t('dashboard.status', 'Status'), t('dashboard.result', 'Wynik')], ...reviewItems.map((item) => [item.spec, item.status, `${item.avgFinal}%`])]),
      [],
      [t('dashboard.weakest', 'Słabe kryteria')],
      ...weakRows,
    ]
    const csv = `\uFEFF${blocks.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
    downloadFile('oceniator-dashboard.csv', 'text/csv;charset=utf-8', csv)
  }

  function dashboardDiagnostics() {
    const storage = canUsePersistentStorage() ? t('dashboard.storage.available', 'dostępny') : t('dashboard.storage.blocked', 'zablokowany')
    return [
      [t('dashboard.diag.dataMode'), assessments.length ? t('dashboard.active', 'aktywny') : t('dashboard.noCards', 'brak kart')],
      [t('dashboard.diag.filtered'), String(active.length)],
      [t('dashboard.diag.total'), String(assessments.length)],
      [t('dashboard.diag.visible'), String(visiblePanels.length)],
      [t('dashboard.diag.hidden'), String(prefs.hidden.length)],
      [t('dashboard.diag.leaders'), canCompareLeaders ? t('dashboard.enabled', 'włączone') : t('dashboard.hiddenForRole', 'ukryte dla tej roli')],
      [t('dashboard.diag.storage'), storage],
    ]
  }

  function renderTrendContent() {
    const maxCount = Math.max(...trend.map((item) => item.count), 1)
    return (
      <div className="trend-chart">
        {trend.map((item) => (
          <div className="trend-column" key={item.period}>
            <div className="trend-meta">
              <strong>{item.avg}%</strong>
              <span>{item.count} {t('dashboard.cards')}</span>
            </div>
            <div className="trend-bar" style={{ ['--bar-height' as string]: `${Math.max(10, item.count / maxCount * 100)}%` }}>
              <i />
            </div>
            <div className="trend-label">
              <span>{item.period}</span>
              <small>{item.below} {t('dashboard.low', 'nisko')} - {item.review} {t('dashboard.decisionQueue', 'decyzji')}</small>
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderLowScoresContent() {
    return <AssessmentTable assessments={[...active].sort((a, b) => a.avgFinal - b.avgFinal).slice(0, 8)} compact />
  }

  const panelRenderers: Record<DashboardPanelKey, () => React.ReactNode> = {
    trend: () => (
      <DashboardWidget panel="trend" title={panelLabel('trend')} subtitle={panelSubtitle('trend')} onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel} t={t}>
        <div className="trend-chart">
          {trend.map((item) => (
            <div className="trend-column" key={item.period}>
              <div className="trend-meta">
                <strong>{item.avg}%</strong>
                <span>{item.count} {t('dashboard.cards')}</span>
              </div>
              <div className="trend-bar" style={{ ['--bar-height' as string]: `${Math.max(10, item.count / Math.max(...trend.map((i) => i.count), 1) * 100)}%` }}>
                <i />
              </div>
              <div className="trend-label">
                <span>{item.period}</span>
                <small>{item.below} {t('dashboard.low', 'nisko')} - {item.review} {t('dashboard.decisionQueue', 'decyzji')}</small>
              </div>
            </div>
          ))}
        </div>
      </DashboardWidget>
    ),
    typeMix: () => (
      <DashboardWidget panel="typeMix" title={panelLabel('typeMix')} subtitle={panelSubtitle('typeMix')} onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel} t={t}>
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
                <small>{value}% {t('dashboard.portfolio', 'portfela')}</small>
              </div>
            )
          })}
        </div>
      </DashboardWidget>
    ),
    sections: () => (
      <DashboardWidget panel="sections" title={panelLabel('sections')} subtitle={panelSubtitle('sections')} onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel} t={t}>
        {sections.slice(0, 8).map((item, index) => (
          <div className="bar-row rich" key={item.label} style={{ ['--row-index' as string]: index }}>
            <span>{item.label}</span>
            <div><i style={{ width: `${item.avg}%` }} /></div>
            <strong>{item.avg}%</strong>
          </div>
        ))}
      </DashboardWidget>
    ),
    leaders: () => (
      <DashboardWidget panel="leaders" title={panelLabel('leaders')} subtitle={panelSubtitle('leaders')} onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel} t={t}>
        <div className="leader-board">
          {leaders.map((item, index) => (
            <div className="leader-row" key={item.leader}>
              <div className="leader-rank">{index < 3 ? <Trophy size={15} /> : index + 1}</div>
              <div>
                <strong>{item.leader}</strong>
                <span>{item.count} {t('dashboard.cards')} - {item.review} {t('dashboard.decisionQueue', 'do decyzji')} - {item.below} {t('dashboard.low', 'nisko')}</span>
              </div>
              <span className={scoreClass(item.avg)}>{item.avg}%</span>
            </div>
          ))}
        </div>
      </DashboardWidget>
    ),
    weak: () => (
      <DashboardWidget panel="weak" title={panelLabel('weak')} subtitle={panelSubtitle('weak')} onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel} t={t}>
        <div className="weak-list enhanced">
          {weak.map((item) => (
            <div className="weak-item" key={item.label}>
              <span>{item.label}</span>
              <strong className={scoreClass(item.avg)}>{item.avg}%</strong>
              <small>{item.count} {t('dashboard.evals', 'ocen cząstkowych')}</small>
            </div>
          ))}
        </div>
      </DashboardWidget>
    ),
    lowScores: () => (
      <DashboardWidget panel="lowScores" title={panelLabel('lowScores')} subtitle={panelSubtitle('lowScores')} onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel} t={t}>
        {renderLowScoresContent()}
      </DashboardWidget>
    ),
  }

  function renderPanel(panel: DashboardPanelKey) {
    return panelRenderers[panel]()
  }

  return (
    <main className={`screen dashboard-screen density-${prefs.density} layout-${prefs.layout}`}>
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="section-title"><span>{t('dashboard.title')}</span><small>{active.length} {t('dashboard.cards')}</small></div>
          <h1>{t('dashboard.hero')}</h1>
          <p className="hint-text">{t('dashboard.heroHint')}</p>
        </div>
        <div className="dashboard-hero-actions">
          <button className="primary-btn" type="button" onClick={() => openRegistry('decision')}>{t('dashboard.goRegistry')}</button>
          <span className="hint-text">{t('dashboard.preferencesHint')}</span>
        </div>
      </section>
      <AnalyticsFilterBar assessments={assessments} filters={filters} onChange={setFilters} />
      <section className="dashboard-grid kpi-grid">
        <div className="metric-panel premium"><span>{t('dashboard.avgScore')}</span><strong>{avg || '-'}%</strong><small>{t('dashboard.metric.avgGoal', 'cel {value}%').replace('{value}', String(goals.minAvg))}</small></div>
        <div className="metric-panel premium"><span>{t('dashboard.greatShare')}</span><strong>{greatShare}%</strong><small>{t('dashboard.metric.avgGoal', 'cel {value}%').replace('{value}', String(goals.greatShare))}</small></div>
        <div className="metric-panel premium"><span>{t('dashboard.cards')}</span><strong>{active.length}</strong><small>{t('dashboard.metric.cards')}</small></div>
        <div className="metric-panel premium"><span>{t('dashboard.belowStandard')}</span><strong>{belowCount}</strong><small>{t('dashboard.metric.needsAction')}</small></div>
      </section>
      <section className="dashboard-focus-grid">
        <div className="data-panel">
          <div className="section-title"><span>{t('dashboard.priority')}</span><small>{t('dashboard.prioritySubtitle')}</small></div>
          {dashboardPriorities.length ? (
            <div className="dashboard-priority-list actionable">
              {dashboardPriorities.map((item) => (
                <button className={`dashboard-priority-card ${item.tone}`} key={item.label} type="button" onClick={item.action}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}{item.suffix}</strong>
                  </div>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">{t('dashboard.noUrgent')}</div>
          )}
        </div>
        <div className="data-panel">
          <div className="section-title"><span>{t('dashboard.trends')}</span><small>{t('dashboard.trendsSubtitle')}</small></div>
          {renderTrendContent()}
        </div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>{t('dashboard.weakestCards')}</span><small>{t('dashboard.weakestCardsSubtitle')}</small></div>
        {renderLowScoresContent()}
      </section>
      <details className="dashboard-more" open={showMore} onToggle={(event) => setShowMore(event.currentTarget.open)}>
        <summary>
          <span>{t('dashboard.more')}</span>
          <small>{t('dashboard.moreSubtitle')}</small>
        </summary>
        <div className="dashboard-more-body">
          <section className="dashboard-controls">
            <div className="dashboard-toggle-group">
              <button className={prefs.layout === 'grid' ? 'active' : ''} type="button" onClick={() => updatePrefs({ layout: 'grid' })}><LayoutDashboard size={15} /> {t('dashboard.grid')}</button>
              <button className={prefs.layout === 'focus' ? 'active' : ''} type="button" onClick={() => updatePrefs({ layout: 'focus' })}><Maximize2 size={15} /> {t('dashboard.focus')}</button>
            </div>
            <div className="dashboard-toggle-group">
              <button className={prefs.density === 'comfortable' ? 'active' : ''} type="button" onClick={() => updatePrefs({ density: 'comfortable' })}>{t('dashboard.comfort')}</button>
              <button className={prefs.density === 'compact' ? 'active' : ''} type="button" onClick={() => updatePrefs({ density: 'compact' })}>{t('dashboard.compact')}</button>
            </div>
            {prefs.hidden.length ? (
              <div className="dashboard-hidden">
                {prefs.hidden
                  .filter((panel) => canCompareLeaders || panel !== 'leaders')
                  .map((panel) => <button key={panel} type="button" onClick={() => showPanel(panel)}>{panelLabel(panel)}</button>)}
              </div>
            ) : null}
            <button className="ghost-btn" type="button" onClick={resetDashboard}><RotateCcw size={15} /> {t('dashboard.resetLayout')}</button>
            <button className="ghost-btn" type="button" onClick={exportDashboardCsv}><Download size={15} /> {t('dashboard.exportCsv')}</button>
            <button className="ghost-btn" type="button" onClick={() => setShowDiagnostics((value) => !value)}><Settings size={15} /> {t('dashboard.diagnostics')}</button>
          </section>
          {showDiagnostics ? (
            <section className="dashboard-diagnostics">
              {dashboardDiagnostics().map(([label, value]) => (
                <div key={label}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </section>
          ) : null}
          <section className="dashboard-config">
            <div className="section-title"><span>{t('dashboard.widgetVisibility')}</span><small>{t('dashboard.widgetVisibilitySubtitle')}</small></div>
            <div className="widget-config-list">
              {prefs.order
                .filter((panel) => canCompareLeaders || panel !== 'leaders')
                .map((panel, index) => {
                  const isHidden = prefs.hidden.includes(panel)
                  const visibleOrder = prefs.order.filter((item) => canCompareLeaders || item !== 'leaders')
                  return (
                    <div className={isHidden ? 'widget-config-row muted' : 'widget-config-row'} key={panel}>
                      <button className="widget-toggle" type="button" onClick={() => togglePanel(panel)}>
                        {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                        {panelLabel(panel)}
                      </button>
                      <div>
                        <button type="button" disabled={index === 0} onClick={() => shiftPanel(panel, -1)} title={t('dashboard.widget.up', 'Przesuń wyżej')}><ChevronUp size={15} /></button>
                        <button type="button" disabled={index === visibleOrder.length - 1} onClick={() => shiftPanel(panel, 1)} title={t('dashboard.widget.down', 'Przesuń niżej')}><ChevronDown size={15} /></button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </section>
          <div className="analytics-grid movable-grid">
            {extraPanels.length ? extraPanels.map((panel) => renderPanel(panel)) : (
              <section className="empty-dashboard">
                <Settings size={34} />
                <h3>{t('dashboard.allHidden')}</h3>
                <p>{t('dashboard.restoreHint', 'Przywróć wybrane panele w konfiguracji albo zresetuj cały układ dashboardu.')}</p>
                <button className="primary-btn" type="button" onClick={resetDashboard}><RotateCcw size={15} /> {t('dashboard.restoreLayout')}</button>
              </section>
            )}
          </div>
        </div>
      </details>
    </main>
  )
}

import { AlertTriangle, CalendarDays, Filter, LineChart, Mail, MessageSquare, MonitorCog, PhoneCall, ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { TYPE_LABELS } from '../../domain/defs'
import { periodOf, ratingLabel } from '../../domain/scoring'
import type { AdminConfig, Assessment, AssessmentComment, AssessmentStatus, AssessmentType, Goal, UserProfile } from '../../domain/types'
import { dashboardTrend, sectionBreakdown, weakestCriteria } from '../dashboard/utils'
import { useLanguage } from '../../i18n/LanguageContext'
import { scoreClass } from '../../lib/display'
import { statusLabels } from '../registry/registryExports'
import { ViewerAssessmentModal } from './ViewerAssessmentModal'
import {
  averageScore,
  formatAssessmentDate,
  sortAssessmentsDesc,
  sortPeriodsAsc,
  sortPeriodsDesc,
} from './viewerMetrics'

function typeIcon(type: AssessmentType) {
  if (type === 'r') return <PhoneCall size={15} />
  if (type === 'm') return <Mail size={15} />
  return <MonitorCog size={15} />
}

function formatScore(value: number | null): string {
  return value === null ? '-' : `${value}%`
}

function periodScopeLabel(scope: string, currentPeriod: string, t: (key: string, fallback?: string) => string): string {
  if (scope === 'current') return `${t('viewer.filters.current', 'Aktualny')} ${currentPeriod}`
  if (scope === 'all') return t('viewer.filters.allPeriods', 'Wszystkie okresy')
  return scope
}

function plannedPerPeriod(goals: Goal, type: AssessmentType | 'all'): number {
  if (type === 'r') return goals.callsPerPeriod
  if (type === 'm') return goals.mailsPerPeriod
  if (type === 's') return goals.systemsPerPeriod
  return goals.callsPerPeriod + goals.mailsPerPeriod + goals.systemsPerPeriod
}

function resultBand(item: Assessment): 'great' | 'good' | 'below' {
  if (item.rating === 'great' || item.avgFinal >= 92) return 'great'
  if (item.rating === 'good' || item.avgFinal >= 82) return 'good'
  return 'below'
}

function matchesResultBand(item: Assessment, band: 'all' | 'great' | 'good' | 'below'): boolean {
  if (band === 'all') return true
  return resultBand(item) === band
}

function resolvePeriodScope(scope: string, currentPeriod: string, allPeriods: string[]): string[] {
  if (scope === 'current') return [currentPeriod]
  if (scope === 'all') return allPeriods
  return [scope]
}

function periodOptions(currentPeriod: string, allPeriods: string[]) {
  return [
    { value: 'current', label: `${currentPeriod}` },
    { value: 'all', label: 'Wszystkie okresy' },
    ...sortPeriodsDesc(allPeriods.filter((period) => period !== currentPeriod)).map((period) => ({
      value: period,
      label: period,
    })),
  ]
}

function buildCompletionLabel(rows: Assessment[], goals: Goal, type: AssessmentType | 'all', periodCount: number): string {
  if (type === 'all') {
    const counts = [
      `R ${rows.filter((item) => item.type === 'r').length}/${goals.callsPerPeriod * periodCount}`,
      `M ${rows.filter((item) => item.type === 'm').length}/${goals.mailsPerPeriod * periodCount}`,
      `S ${rows.filter((item) => item.type === 's').length}/${goals.systemsPerPeriod * periodCount}`,
    ]
    return counts.join(' • ')
  }

  const planned = plannedPerPeriod(goals, type) * periodCount
  return `${rows.length}/${planned}`
}

function buildFeedbackMessage({
  average,
  delta,
  goal,
  priorityLabel,
  priorityValue,
  latestNote,
  periodLabel,
}: {
  average: number | null
  delta: number | null
  goal: number
  priorityLabel?: string
  priorityValue?: number
  latestNote?: string
  periodLabel: string
}): string {
  if (average === null) {
    return `Brak ocen w ${periodLabel}. Poszerz zakres, aby zobaczyc pelny obraz wynikow.`
  }

  const avgPart = average >= goal
    ? `Srednia ${average}% jest ${average - goal} pp ponad celem ${goal}%.`
    : `Srednia ${average}% jest o ${goal - average} pp ponizej celu ${goal}%.`
  const deltaPart = delta === null
    ? 'To pierwszy punkt odniesienia dla wybranego zakresu.'
    : `Zmiana vs poprzedni okres: ${delta >= 0 ? '+' : ''}${delta} pp.`
  const priorityPart = priorityLabel && priorityValue !== undefined
    ? `Najpilniejszy obszar: ${priorityLabel} (${priorityValue}%).`
    : 'Brak wyodrebnionego priorytetu. '
  const notePart = latestNote ? `Najnowszy komentarz: ${latestNote}` : ''

  return [avgPart, deltaPart, priorityPart, notePart].filter(Boolean).join(' ')
}

function buildSeriesPath(series: Array<{ avg: number }>): string {
  if (!series.length) return ''
  const points = series.map((item, index) => {
    const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100
    const y = 100 - Math.max(4, Math.min(96, item.avg))
    return { x, y }
  })
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
}

function TrendChart({
  series,
}: {
  series: Array<{ period: string; avg: number; count: number }>
}) {
  const path = buildSeriesPath(series)

  if (!series.length) {
    return <div className="empty-state compact-empty">Brak danych do pokazania wykresu.</div>
  }

  return (
    <div className="viewer-trend-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="viewer-trend-svg">
        <defs>
          <linearGradient id="viewerTrendFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--teal)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="viewerTrendStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--teal)" />
            <stop offset="100%" stopColor="var(--blue)" />
          </linearGradient>
        </defs>
        <line x1="0" y1="20" x2="100" y2="20" className="viewer-trend-grid" />
        <line x1="0" y1="50" x2="100" y2="50" className="viewer-trend-grid" />
        <line x1="0" y1="80" x2="100" y2="80" className="viewer-trend-grid" />
        {path ? <path d={`${path} L 100 100 L 0 100 Z`} fill="url(#viewerTrendFill)" /> : null}
        {path ? <path d={path} fill="none" stroke="url(#viewerTrendStroke)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {series.map((item, index) => {
          const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100
          const y = 100 - Math.max(4, Math.min(96, item.avg))
          return <circle key={item.period} cx={x} cy={y} r="2.9" className="viewer-trend-point" />
        })}
      </svg>
      <div className="viewer-trend-labels">
        {series.map((item) => (
          <div key={item.period} className="viewer-trend-label">
            <strong>{item.avg}%</strong>
            <span>{item.period}</span>
            <small>{item.count} ocen</small>
          </div>
        ))}
      </div>
    </div>
  )
}

function ViewerSelect({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  hint?: string
}) {
  return (
    <label className="viewer-filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

type FilterModalKey = 'summary' | 'trend' | 'recent'

function ViewerFilterPreviewGrid({
  items,
}: {
  items: Array<{ label: string; value: string }>
}) {
  return (
    <div className="viewer-filter-preview-grid">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

function ViewerFilterModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className="modal-backdrop viewer-filter-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <section
        className="modal-card viewer-filter-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Zamknij">
            <X size={18} />
          </button>
        </header>
        <div className="viewer-filter-modal-body">
          <div className="viewer-filter-modal-grid">
            {children}
          </div>
          <p className="viewer-filter-modal-note">Zmiany zapisują się od razu i wpływają na wskazany panel.</p>
        </div>
      </section>
    </div>
  )
}

export default function ViewerPortalView({
  user,
  assessments,
  goals,
  loadComments,
}: {
  user: UserProfile
  assessments: Assessment[]
  goals: AdminConfig['goals']
  loadComments?: (assessmentId: string) => Promise<AssessmentComment[]>
}) {
  const { t } = useLanguage()
  const currentPeriod = useMemo(() => periodOf(new Date().toISOString().slice(0, 10)), [])
  const active = useMemo(() => assessments.filter((item) => item.status !== 'archived'), [assessments])
  const ordered = useMemo(() => sortAssessmentsDesc(active), [active])
  const allPeriods = useMemo(() => sortPeriodsAsc([...active.map((item) => item.period), currentPeriod]), [active, currentPeriod])
  const periodSelectOptions = useMemo(() => periodOptions(currentPeriod, allPeriods), [allPeriods, currentPeriod])
  const typeOptions = useMemo(() => ([
    { value: 'all', label: t('viewer.filters.typeAll', 'Wszystkie typy') },
    ...(['r', 'm', 's'] as AssessmentType[]).map((type) => ({ value: type, label: TYPE_LABELS[type] })),
  ]), [t])
  const statusOptions = useMemo(() => ([
    { value: 'all', label: t('viewer.filters.statusAll', 'Wszystkie statusy') },
    ...(['submitted', 'review', 'approved', 'archived'] as AssessmentStatus[]).map((status) => ({
      value: status,
      label: statusLabels[status],
    })),
  ]), [t])
  const resultOptions = useMemo(() => ([
    { value: 'all', label: t('viewer.filters.resultAll', 'Wszystkie wyniki') },
    { value: 'great', label: t('viewer.filters.resultGreat', 'Bardzo dobry') },
    { value: 'good', label: t('viewer.filters.resultGood', 'Dobry') },
    { value: 'below', label: t('viewer.filters.resultBelow', 'Ponizej standardu') },
  ]), [t])
  const evaluatorOptions = useMemo(() => ([
    { value: 'all', label: t('viewer.filters.evaluatorAll', 'Wszyscy oceniajacy') },
    ...[...new Set(active.map((item) => item.oce).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'pl')).map((name) => ({
      value: name,
      label: name,
    })),
  ]), [active, t])

  const [summaryPeriod, setSummaryPeriod] = useState<string>('current')
  const [summaryType, setSummaryType] = useState<AssessmentType | 'all'>('all')
  const [trendWindow, setTrendWindow] = useState<'3' | '5' | 'all'>('5')
  const [trendType, setTrendType] = useState<AssessmentType | 'all'>('all')
  const [recentPeriod, setRecentPeriod] = useState<string>('current')
  const [recentType, setRecentType] = useState<AssessmentType | 'all'>('all')
  const [recentStatus, setRecentStatus] = useState<AssessmentStatus | 'all'>('all')
  const [recentResult, setRecentResult] = useState<'all' | 'great' | 'good' | 'below'>('all')
  const [recentEvaluator, setRecentEvaluator] = useState<string>('all')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [openFilterModal, setOpenFilterModal] = useState<FilterModalKey | null>(null)
  const [commentsByAssessment, setCommentsByAssessment] = useState<Record<string, AssessmentComment[]>>({})
  const [commentsLoadingId, setCommentsLoadingId] = useState<string | null>(null)

  const summaryPeriods = useMemo(() => resolvePeriodScope(summaryPeriod, currentPeriod, allPeriods), [allPeriods, currentPeriod, summaryPeriod])
  const recentPeriods = useMemo(() => resolvePeriodScope(recentPeriod, currentPeriod, allPeriods), [allPeriods, currentPeriod, recentPeriod])

  const summaryPool = useMemo(() => (
    ordered.filter((item) => (summaryType === 'all' || item.type === summaryType))
  ), [ordered, summaryType])
  const summaryRows = useMemo(() => (
    summaryPool.filter((item) => summaryPeriods.includes(item.period))
  ), [summaryPeriods, summaryPool])
  const summaryAverage = useMemo(() => averageScore(summaryRows), [summaryRows])
  const summaryPeriodLabel = useMemo(() => periodScopeLabel(summaryPeriod, currentPeriod, t), [currentPeriod, summaryPeriod, t])
  const summaryPlanned = useMemo(() => plannedPerPeriod(goals, summaryType) * summaryPeriods.length, [goals, summaryPeriods.length, summaryType])
  const summaryCompletion = useMemo(() => buildCompletionLabel(summaryRows, goals, summaryType, summaryPeriods.length), [goals, summaryPeriods.length, summaryRows, summaryType])
  const summaryTrendSeries = useMemo(() => dashboardTrend(summaryPool), [summaryPool])
  const summaryTargetPeriod = summaryPeriod === 'all'
    ? summaryTrendSeries.at(-1)?.period || currentPeriod
    : summaryPeriod === 'current'
      ? currentPeriod
      : summaryPeriod
  const summaryTargetIndex = summaryTrendSeries.findIndex((item) => item.period === summaryTargetPeriod)
  const summaryDelta = summaryTargetIndex > 0 ? summaryTrendSeries[summaryTargetIndex].avg - summaryTrendSeries[summaryTargetIndex - 1].avg : null
  const summaryPrioritySection = useMemo(() => sectionBreakdown(summaryRows)[0] || null, [summaryRows])
  const summaryPriorityCriterion = useMemo(() => weakestCriteria(summaryRows)[0] || null, [summaryRows])
  const summaryLatest = summaryRows[0] || ordered[0] || null
  const summaryNote = summaryLatest?.notes || ''
  const heroMessage = useMemo(() => buildFeedbackMessage({
    average: summaryAverage,
    delta: summaryDelta,
    goal: goals.minAvg,
    priorityLabel: summaryPrioritySection?.label,
    priorityValue: summaryPrioritySection?.avg,
    latestNote: summaryNote,
    periodLabel: summaryPeriodLabel,
  }), [goals.minAvg, summaryAverage, summaryDelta, summaryPeriodLabel, summaryPrioritySection?.avg, summaryPrioritySection?.label, summaryNote])

  const trendPool = useMemo(() => active.filter((item) => trendType === 'all' || item.type === trendType), [active, trendType])
  const trendSeries = useMemo(() => dashboardTrend(trendPool), [trendPool])
  const visibleTrendSeries = useMemo(() => {
    if (trendWindow === 'all') return trendSeries
    const limit = Number(trendWindow)
    return trendSeries.slice(-limit)
  }, [trendSeries, trendWindow])
  const summaryTypeLabel = summaryType === 'all' ? t('viewer.filters.typeAll', 'Wszystkie typy') : TYPE_LABELS[summaryType]
  const trendTypeLabel = trendType === 'all' ? t('viewer.filters.typeAll', 'Wszystkie typy') : TYPE_LABELS[trendType]
  const trendWindowLabel = trendWindow === '3'
    ? t('viewer.filters.last3', 'Ostatnie 3')
    : trendWindow === '5'
      ? t('viewer.filters.last5', 'Ostatnie 5')
      : t('viewer.filters.allTrend', 'Wszystkie')
  const recentPeriodLabel = periodScopeLabel(recentPeriod, currentPeriod, t)
  const recentTypeLabel = recentType === 'all' ? t('viewer.filters.typeAll', 'Wszystkie typy') : TYPE_LABELS[recentType]
  const recentStatusLabel = recentStatus === 'all' ? t('viewer.filters.statusAll', 'Wszystkie statusy') : statusLabels[recentStatus]
  const recentResultLabel = recentResult === 'all'
    ? t('viewer.filters.resultAll', 'Wszystkie wyniki')
    : recentResult === 'great'
      ? t('viewer.filters.resultGreat', 'Bardzo dobry')
      : recentResult === 'good'
        ? t('viewer.filters.resultGood', 'Dobry')
        : t('viewer.filters.resultBelow', 'Ponizej standardu')
  const recentEvaluatorLabel = recentEvaluator === 'all' ? t('viewer.filters.evaluatorAll', 'Wszyscy oceniajacy') : recentEvaluator

  const recentRows = useMemo(() => {
    return sortAssessmentsDesc(active).filter((item) => (
      (recentType === 'all' || item.type === recentType)
      && recentPeriods.includes(item.period)
      && (recentStatus === 'all' || item.status === recentStatus)
      && matchesResultBand(item, recentResult)
      && (recentEvaluator === 'all' || item.oce === recentEvaluator || item.leaderScope === recentEvaluator)
    ))
  }, [active, recentEvaluator, recentPeriods, recentResult, recentStatus, recentType])

  const recentPreview = useMemo(() => recentRows.slice(0, 3), [recentRows])
  const selectedAssessment = useMemo(() => (
    selectedAssessmentId ? active.find((item) => item.id === selectedAssessmentId) || null : null
  ), [active, selectedAssessmentId])
  const modalAssessments = useMemo(() => {
    if (!selectedAssessment) return recentPreview
    const items = [selectedAssessment, ...recentPreview]
    const seen = new Set<string>()
    return items.filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }, [recentPreview, selectedAssessment])
  const selectedComments = selectedAssessment ? commentsByAssessment[selectedAssessment.id] || [] : []
  const selectedCommentsLoading = selectedAssessment ? commentsLoadingId === selectedAssessment.id && !commentsByAssessment[selectedAssessment.id] : false

  function openAssessment(assessmentId: string) {
    setSelectedAssessmentId(assessmentId)
    setCommentsLoadingId(commentsByAssessment[assessmentId] ? null : assessmentId)
  }

  function toggleFilterModal(panel: FilterModalKey) {
    setOpenFilterModal((current) => (current === panel ? null : panel))
  }

  useEffect(() => {
    if (!selectedAssessment || !loadComments) return
    if (commentsByAssessment[selectedAssessment.id]) return

    let cancelled = false
    void loadComments(selectedAssessment.id)
      .then((comments) => {
        if (cancelled) return
        setCommentsByAssessment((current) => ({ ...current, [selectedAssessment.id]: comments }))
      })
      .catch(() => {
        if (cancelled) return
        setCommentsByAssessment((current) => ({ ...current, [selectedAssessment.id]: [] }))
      })
      .finally(() => {
        if (!cancelled) setCommentsLoadingId((current) => (current === selectedAssessment.id ? null : current))
      })

    return () => {
      cancelled = true
    }
  }, [commentsByAssessment, loadComments, selectedAssessment])

  useEffect(() => {
    if (!openFilterModal) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenFilterModal(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openFilterModal])

  return (
    <main className="screen viewer-home-screen">
      <section className="viewer-hero">
        <div className="viewer-hero-copy">
          <div className="section-title">
            <span>{t('route.viewer.eyebrow', 'Portal / Specjalista')}</span>
            <small>{summaryPeriodLabel}</small>
          </div>
          <h1>{t('viewer.hero.title', 'Witaj, {name}').replace('{name}', user.fullName)}</h1>
          <p>{heroMessage}</p>
          <div className="viewer-hero-strip">
            <span><ShieldCheck size={15} /> {t('viewer.hero.readOnly', 'Tylko podglad')}</span>
            <span><CalendarDays size={15} /> {currentPeriod}</span>
            <span><Target size={15} /> {t('viewer.hero.goal', 'Cel')} {goals.minAvg}%</span>
            <span>
              {summaryDelta === null ? <LineChart size={15} /> : summaryDelta >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {summaryDelta === null
                ? t('viewer.hero.noDelta', 'Brak porownania do poprzedniego okresu')
                : `${summaryDelta >= 0 ? '+' : ''}${summaryDelta} pp ${t('viewer.hero.vsPrev', 'vs poprzedni okres')}`}
            </span>
          </div>
        </div>

        <div className="viewer-hero-summary">
          <span>{t('viewer.hero.summaryLabel', 'Najwazniejszy sygnal')}</span>
          <strong className={scoreClass(summaryAverage ?? 0)}>{formatScore(summaryAverage)}</strong>
          <small>{summaryCompletion}</small>
          <div className="viewer-hero-summary-grid">
            <div>
              <span>{t('viewer.hero.latest', 'Ostatnia ocena')}</span>
              <strong>{summaryLatest ? `${summaryLatest.avgFinal}%` : '-'}</strong>
              <small>{summaryLatest ? `${TYPE_LABELS[summaryLatest.type]} • ${summaryLatest.period}` : t('viewer.hero.noLatest', 'Brak danych')}</small>
            </div>
            <div>
              <span>{t('viewer.hero.priority', 'Priorytet')}</span>
              <strong>{summaryPrioritySection ? `${summaryPrioritySection.avg}%` : '-'}</strong>
              <small>{summaryPrioritySection ? summaryPrioritySection.label : t('viewer.hero.noPriority', 'Brak priorytetu')}</small>
            </div>
          </div>
        </div>
      </section>

      <section className="viewer-kpi-grid">
        <div className="metric-panel premium">
          <span>{t('viewer.kpi.average', 'Srednia ocen')}</span>
          <strong className={scoreClass(summaryAverage ?? 0)}>{formatScore(summaryAverage)}</strong>
          <small>{summaryPeriodLabel}</small>
        </div>
        <div className="metric-panel premium">
          <span>{t('viewer.kpi.completion', 'Stan realizacji')}</span>
          <strong>{summaryRows.length}/{summaryPlanned}</strong>
          <small>{summaryCompletion}</small>
        </div>
        <div className="metric-panel premium">
          <span>{t('viewer.kpi.delta', 'Zmiana vs poprzedni okres')}</span>
          <strong className={summaryDelta === null ? '' : summaryDelta >= 0 ? 'score score-great' : 'score score-below'}>
            {summaryDelta === null ? '-' : `${summaryDelta >= 0 ? '+' : ''}${summaryDelta} pp`}
          </strong>
          <small>{summaryDelta === null ? t('viewer.kpi.noDelta', 'Brak danych do porownania') : t('viewer.kpi.periodBased', 'Na podstawie filtrowanego zakresu')}</small>
        </div>
        <div className="metric-panel premium">
          <span>{t('viewer.kpi.priority', 'Najpilniejszy obszar')}</span>
          <strong>{summaryPrioritySection ? summaryPrioritySection.label : '-'}</strong>
          <small>{summaryPriorityCriterion ? `${summaryPriorityCriterion.label} • ${summaryPriorityCriterion.avg}%` : t('viewer.kpi.noPriority', 'Brak wyroznionego obszaru')}</small>
        </div>
      </section>

      <section className="viewer-filter-grid">
        <article className="data-panel viewer-filter-panel">
          <div className="viewer-panel-head">
            <div className="section-title viewer-panel-title">
              <div>
                <span>{t('viewer.filters.summaryTitle', 'Filtr podsumowania')}</span>
                <small>{t('viewer.filters.summaryHint', 'Wyniki i priorytet licza sie osobno dla wybranego okresu')}</small>
              </div>
              <button
                type="button"
                className="viewer-filter-trigger"
                onClick={() => toggleFilterModal('summary')}
                aria-haspopup="dialog"
                aria-expanded={openFilterModal === 'summary'}
              >
                <Filter size={15} />
                {t('viewer.filters.open', 'Filtry')}
              </button>
            </div>
          </div>
          <ViewerFilterPreviewGrid
            items={[
              { label: t('viewer.filters.period', 'Okres'), value: summaryPeriodLabel },
              { label: t('viewer.filters.type', 'Typ'), value: summaryTypeLabel },
            ]}
          />
        </article>

        <article className="data-panel viewer-filter-panel">
          <div className="viewer-panel-head">
            <div className="section-title viewer-panel-title">
              <div>
                <span><LineChart size={15} /> {t('viewer.filters.trendTitle', 'Filtr trendu')}</span>
                <small>{t('viewer.filters.trendHint', 'Wykres liniowy z ostatnich okresow')}</small>
              </div>
              <button
                type="button"
                className="viewer-filter-trigger"
                onClick={() => toggleFilterModal('trend')}
                aria-haspopup="dialog"
                aria-expanded={openFilterModal === 'trend'}
              >
                <Filter size={15} />
                {t('viewer.filters.open', 'Filtry')}
              </button>
            </div>
          </div>
          <ViewerFilterPreviewGrid
            items={[
              { label: t('viewer.filters.type', 'Typ'), value: trendTypeLabel },
              { label: t('viewer.filters.window', 'Okno wykresu'), value: trendWindowLabel },
            ]}
          />
        </article>

        <article className="data-panel viewer-filter-panel">
          <div className="viewer-panel-head">
            <div className="section-title viewer-panel-title">
              <div>
                <span><Users size={15} /> {t('viewer.filters.recentTitle', 'Filtr ostatnich ocen')}</span>
                <small>{t('viewer.filters.recentHint', 'Liczba widocznych kart jest ograniczona do 3 najnowszych')}</small>
              </div>
              <button
                type="button"
                className="viewer-filter-trigger"
                onClick={() => toggleFilterModal('recent')}
                aria-haspopup="dialog"
                aria-expanded={openFilterModal === 'recent'}
              >
                <Filter size={15} />
                {t('viewer.filters.open', 'Filtry')}
              </button>
            </div>
          </div>
          <ViewerFilterPreviewGrid
            items={[
              { label: t('viewer.filters.period', 'Okres'), value: recentPeriodLabel },
              { label: t('viewer.filters.type', 'Typ'), value: recentTypeLabel },
              { label: t('viewer.filters.status', 'Status'), value: recentStatusLabel },
              { label: t('viewer.filters.result', 'Wynik'), value: recentResultLabel },
              { label: t('viewer.filters.evaluator', 'Oceniajacy'), value: recentEvaluatorLabel },
            ]}
          />
        </article>
      </section>

      <section className="viewer-focus-grid">
        <article className="data-panel viewer-trend-panel">
          <div className="section-title">
            <span><TrendingUp size={15} /> {t('viewer.trend.title', 'Trend wynikow')}</span>
            <small>{t('viewer.trend.subtitle', 'Linia pokazuje zmianę średnich w kolejnych okresach')}</small>
          </div>
          <TrendChart series={visibleTrendSeries} />
        </article>

        <article className="data-panel viewer-feedback-panel">
          <div className="section-title">
            <span><Sparkles size={15} /> {t('viewer.feedback.title', 'Feedback na dzis')}</span>
            <small>{summaryPeriodLabel}</small>
          </div>
          <div className="viewer-feedback-card">
            {summaryPrioritySection ? (
              <div className="viewer-feedback-priority">
                <div className="viewer-feedback-priority-icon">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <strong>{summaryPrioritySection.label}</strong>
                  <p>{summaryPriorityCriterion ? `${summaryPriorityCriterion.label} • ${summaryPriorityCriterion.avg}%` : t('viewer.feedback.noCriterion', 'Brak najniższego kryterium do pokazania')}</p>
                  <span>{summaryPrioritySection.avg}%</span>
                </div>
              </div>
            ) : (
              <div className="empty-state compact-empty">{t('viewer.feedback.empty', 'Po wybraniu zakresu pojawi sie tu najpilniejszy obszar do poprawy.')}</div>
            )}

            <div className="viewer-feedback-copy">
              <p>{heroMessage}</p>
              <div className="viewer-feedback-meta">
                <div>
                  <span>{t('viewer.feedback.latest', 'Najnowsza ocena')}</span>
                  <strong>{summaryLatest ? `${summaryLatest.avgFinal}%` : '-'}</strong>
                </div>
                <div>
                  <span>{t('viewer.feedback.rating', 'Ocena')}</span>
                  <strong>{summaryLatest ? ratingLabel(summaryLatest.rating) : '-'}</strong>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="data-panel viewer-recent-panel">
        <div className="section-title">
          <span><CalendarDays size={15} /> {t('viewer.recent.title', 'Ostatnie oceny')}</span>
          <small>{recentRows.length ? `${t('viewer.recent.showing', 'Pokazano')} ${recentPreview.length} ${t('viewer.recent.of', 'z')} ${recentRows.length}` : t('viewer.recent.emptyTitle', 'Brak ocen w wybranym zakresie')}</small>
        </div>

        {recentPreview.length ? (
          <div className="viewer-recent-list">
            {recentPreview.map((item) => (
              <button
                key={item.id}
                type="button"
                className="viewer-recent-card"
                onClick={() => openAssessment(item.id)}
              >
                <div className="viewer-recent-icon">{typeIcon(item.type)}</div>
                <div className="viewer-recent-copy">
                  <strong>{item.spec}</strong>
                  <span>{TYPE_LABELS[item.type]} • {item.period} • {formatAssessmentDate(item.data)}</span>
                  <small>{item.notes || t('viewer.recent.noNote', 'Brak podsumowania przy tej ocenie.')}</small>
                </div>
                <div className="viewer-recent-meta">
                  <span className={`status ${item.status}`}>{statusLabels[item.status]}</span>
                  <strong className={scoreClass(item.avgFinal)}>{item.avgFinal}%</strong>
                  <small>{ratingLabel(item.rating)}</small>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <MessageSquare size={28} />
            <span>{t('viewer.recent.noData', 'Brak ocen pasujacych do aktywnych filtrow.')}</span>
          </div>
        )}
      </section>

      {selectedAssessment ? (
        <ViewerAssessmentModal
          assessment={selectedAssessment}
          quickAssessments={modalAssessments.filter((item) => item.id !== selectedAssessment.id)}
          comments={selectedComments}
          commentsLoading={selectedCommentsLoading}
          onClose={() => setSelectedAssessmentId(null)}
          onSelectAssessment={openAssessment}
        />
      ) : null}

      {openFilterModal === 'summary' ? (
        <ViewerFilterModal
          title={t('viewer.filters.summaryTitle', 'Filtr podsumowania')}
          description={t('viewer.filters.summaryHint', 'Wyniki i priorytet licza sie osobno dla wybranego okresu')}
          onClose={() => setOpenFilterModal(null)}
        >
          <ViewerSelect
            label={t('viewer.filters.period', 'Okres')}
            value={summaryPeriod}
            onChange={setSummaryPeriod}
            options={periodSelectOptions}
            hint={t('viewer.filters.periodHint', 'Domyslnie aktualny okres')}
          />
          <ViewerSelect
            label={t('viewer.filters.type', 'Typ')}
            value={summaryType}
            onChange={(value) => setSummaryType(value as AssessmentType | 'all')}
            options={typeOptions}
          />
        </ViewerFilterModal>
      ) : null}

      {openFilterModal === 'trend' ? (
        <ViewerFilterModal
          title={t('viewer.filters.trendTitle', 'Filtr trendu')}
          description={t('viewer.filters.trendHint', 'Wykres liniowy z ostatnich okresow')}
          onClose={() => setOpenFilterModal(null)}
        >
          <ViewerSelect
            label={t('viewer.filters.type', 'Typ')}
            value={trendType}
            onChange={(value) => setTrendType(value as AssessmentType | 'all')}
            options={typeOptions}
          />
          <ViewerSelect
            label={t('viewer.filters.window', 'Okno wykresu')}
            value={trendWindow}
            onChange={(value) => setTrendWindow(value as '3' | '5' | 'all')}
            options={[
              { value: '3', label: t('viewer.filters.last3', 'Ostatnie 3') },
              { value: '5', label: t('viewer.filters.last5', 'Ostatnie 5') },
              { value: 'all', label: t('viewer.filters.allTrend', 'Wszystkie') },
            ]}
          />
        </ViewerFilterModal>
      ) : null}

      {openFilterModal === 'recent' ? (
        <ViewerFilterModal
          title={t('viewer.filters.recentTitle', 'Filtr ostatnich ocen')}
          description={t('viewer.filters.recentHint', 'Liczba widocznych kart jest ograniczona do 3 najnowszych')}
          onClose={() => setOpenFilterModal(null)}
        >
          <ViewerSelect
            label={t('viewer.filters.period', 'Okres')}
            value={recentPeriod}
            onChange={setRecentPeriod}
            options={periodSelectOptions}
          />
          <ViewerSelect
            label={t('viewer.filters.type', 'Typ')}
            value={recentType}
            onChange={(value) => setRecentType(value as AssessmentType | 'all')}
            options={typeOptions}
          />
          <ViewerSelect
            label={t('viewer.filters.status', 'Status')}
            value={recentStatus}
            onChange={(value) => setRecentStatus(value as AssessmentStatus | 'all')}
            options={statusOptions}
          />
          <ViewerSelect
            label={t('viewer.filters.result', 'Wynik')}
            value={recentResult}
            onChange={(value) => setRecentResult(value as 'all' | 'great' | 'good' | 'below')}
            options={resultOptions}
          />
          <ViewerSelect
            label={t('viewer.filters.evaluator', 'Oceniajacy')}
            value={recentEvaluator}
            onChange={setRecentEvaluator}
            options={evaluatorOptions}
          />
        </ViewerFilterModal>
      ) : null}
    </main>
  )
}


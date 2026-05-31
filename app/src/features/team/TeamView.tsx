import { AlertTriangle, Eye, Plus, TimerReset, UserRoundSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { canCompareLeadersRole, canCreateRole } from '../../domain/access'
import { TYPE_LABELS } from '../../domain/defs'
import { lastHistoryAt, lastHistoryBy, lastHistoryNote, shortDateTime } from '../../domain/history'
import type { AdminConfig, Assessment, UserProfile } from '../../domain/types'
import { dashboardTrend, sectionBreakdown, weakestCriteria } from '../dashboard/utils'
import { scoreClass } from '../../lib/display'
import { AssessmentDetailModal } from '../registry/AssessmentDetailModal'
import { statusLabels } from '../registry/registryExports'
import { SpecialistProfileModal } from '../specialists/profile'
import { useLanguage } from '../../i18n/LanguageContext'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

function daysSince(value?: string): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return null
  return Math.floor((Date.now() - time) / 86400000)
}

function specialistPriorityScore(item: {
  avg: number
  pending: number
  below: number
  staleDays: number | null
  count: number
}): number {
  const staleWeight = item.staleDays === null ? 18 : item.staleDays > 21 ? 24 : item.staleDays > 14 ? 14 : 0
  const missingWeight = item.count === 0 ? 28 : 0
  return (item.pending * 40) + (item.below * 26) + staleWeight + missingWeight + (100 - item.avg)
}

function assessmentPriorityScore(assessment: Assessment): number {
  const statusWeight = assessment.status === 'review' ? 40 : assessment.status === 'submitted' ? 30 : 0
  const ratingWeight = assessment.rating === 'below' ? 25 : assessment.rating === 'good' ? 10 : 0
  return statusWeight + ratingWeight + (100 - assessment.avgFinal)
}

export default function TeamView({
  user,
  admin,
  assessments,
  setView,
  openRegistry,
  onStartAssessmentForSpecialist,
}: {
  user: UserProfile
  admin: AdminConfig
  assessments: Assessment[]
  setView: (view: ViewKey) => void
  openRegistry: (preset?: 'all' | 'decision' | 'recent' | 'edited') => void
  onStartAssessmentForSpecialist?: (name: string) => void
}) {
  const { t } = useLanguage()
  const teamTitle = user.role === 'assessor' ? t('team.assessorTitle', 'Zakres oceniającego') : t('team.title')

  const leaderOptions = useMemo(() => {
    if (canCompareLeadersRole(user.role)) return admin.leaders
    return [user.leaderScope].filter(Boolean)
  }, [admin.leaders, user.leaderScope, user.role])

  const [leader, setLeader] = useState(() => leaderOptions[0] || '')
  const [selectedSpecialistProfile, setSelectedSpecialistProfile] = useState<string | null>(null)
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)

  const activeLeader = leaderOptions.includes(leader) ? leader : leaderOptions[0] || ''
  const scopeLabel = activeLeader || t('team.fullScope', 'Pełny zakres')

  const specialists = useMemo(() => (
    admin.specialists
      .filter((item) => item.active && (!activeLeader || item.leader === activeLeader))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  ), [admin.specialists, activeLeader])

  const rows = useMemo(() => assessments.filter((item) => (
    item.status !== 'archived'
    && (!activeLeader || item.leaderScope === activeLeader || item.oce === activeLeader)
  )), [assessments, activeLeader])

  const specialistRows = useMemo(() => (
    specialists.map((specialist) => {
      const specialistAssessments = rows.filter((item) => item.spec === specialist.name)
      const recent = [...specialistAssessments].sort((a, b) => b.data.localeCompare(a.data) || b.avgFinal - a.avgFinal)
      const last = recent[0]
      const avg = specialistAssessments.length
        ? Math.round(specialistAssessments.reduce((acc, item) => acc + item.avgFinal, 0) / specialistAssessments.length)
        : 0
      const pending = specialistAssessments.filter((item) => item.status === 'submitted' || item.status === 'review').length
      const below = specialistAssessments.filter((item) => item.rating === 'below').length
      const staleDays = daysSince(last?.data)

      return {
        specialist,
        count: specialistAssessments.length,
        avg,
        pending,
        below,
        last,
        staleDays,
        risk: specialistPriorityScore({ avg, pending, below, staleDays, count: specialistAssessments.length }),
        needsAttention: pending > 0 || below > 0 || !last || (staleDays !== null && staleDays > 21),
      }
    }).sort((a, b) => b.risk - a.risk || a.specialist.name.localeCompare(b.specialist.name, 'pl'))
  ), [rows, specialists])

  const trend = useMemo(() => dashboardTrend(rows), [rows])
  const trendMaxCount = Math.max(...trend.map((item) => item.count), 1)
  const weakSections = useMemo(() => sectionBreakdown(rows).slice(0, 5), [rows])
  const weakCriteria = useMemo(() => weakestCriteria(rows).slice(0, 6), [rows])

  const avg = rows.length ? Math.round(rows.reduce((acc, item) => acc + item.avgFinal, 0) / rows.length) : 0
  const pending = rows.filter((item) => item.status === 'submitted' || item.status === 'review').length
  const below = rows.filter((item) => item.rating === 'below').length
  const freshCards = rows.filter((item) => {
    const age = daysSince(item.data)
    return age !== null && age <= 14
  }).length

  const teamFocus = [
    pending
      ? {
          label: t('registry.onlyDecision', 'Do decyzji'),
          value: pending,
          hint: t('team.focus.decisionHint', 'Karty submitted i review czekają na decyzję lub komentarz.'),
          tone: 'alert' as const,
          action: () => openRegistry('decision'),
        }
      : null,
    below
      ? {
          label: t('dashboard.belowStandard', 'Poniżej standardu'),
          value: below,
          hint: t('team.focus.belowHint', 'To najszybsza lista do feedbacku i kalibracji.'),
          tone: 'warning' as const,
          action: () => setView('dashboard'),
        }
      : null,
    freshCards
      ? {
          label: t('team.freshCards', 'Świeże karty'),
          value: freshCards,
          hint: t('team.focus.freshHint', 'Karty z ostatnich 14 dni pokazują tempo pracy zespołu.'),
          tone: 'neutral' as const,
          action: () => openRegistry('recent'),
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string
    value: number
    hint: string
    tone: 'alert' | 'warning' | 'neutral'
    action: () => void
  }>

  const prioritySpecialists = specialistRows.filter((item) => item.needsAttention).slice(0, 5)

  const queueRows = [...rows]
    .sort((a, b) => assessmentPriorityScore(b) - assessmentPriorityScore(a) || b.data.localeCompare(a.data, 'pl'))
    .slice(0, 6)

  const metrics = [
    { label: t('team.activeSpecialists', 'aktywnych specjalistów'), value: specialistRows.length, hint: t('team.activeScope') },
    { label: t('team.activeCards'), value: rows.length, hint: t('team.withoutArchive') },
    { label: t('team.avgScore'), value: avg || '-', hint: t('team.forTeam'), suffix: '%' },
    { label: t('team.pending'), value: pending, hint: t('team.noQueue') },
  ]

  const heroChips = [
    { label: scopeLabel, tone: 'neutral' as const },
    { label: `${pending} ${t('team.pending')}`, tone: pending ? 'warning' as const : 'neutral' as const },
    { label: `${below} ${t('dashboard.belowStandard')}`, tone: below ? 'warning' as const : 'neutral' as const },
    { label: `${freshCards} ${t('team.freshCards', 'Świeże karty')}`, tone: freshCards ? 'success' as const : 'neutral' as const },
  ]

  const trendDelta = trend.length > 1 ? trend[trend.length - 1].avg - trend[0].avg : null

  return (
    <main className="screen">
      <section className="team-hero data-panel">
        <div className="team-hero-copy">
          <div className="section-title">
            <span>{teamTitle}</span>
            <small>{scopeLabel}</small>
          </div>
          <h1>{t('team.hero', 'Pulpit wyników wybranego zespołu.')}</h1>
          <p>{t('team.heroHint', 'Na jednym ekranie widzisz wynik, tempo, ryzyka i osoby wymagające reakcji. To skrót do zarządzania, nie kolejna lista kart.')}</p>
          <div className="status-chips">
            {heroChips.map((chip) => (
              <span key={chip.label} className={`status-chip ${chip.tone}`}>
                {chip.label}
              </span>
            ))}
          </div>
        </div>
        <div className="team-actions">
          {leaderOptions.length > 1 ? (
            <label>
              <span>{t('team.leader')}</span>
              <select value={activeLeader} onChange={(event) => setLeader(event.target.value)}>
                {leaderOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          ) : null}
          {canCreateRole(user.role) ? (
            <button className="primary-btn" type="button" onClick={() => setView('form')}>
              <Plus size={16} /> {t('team.newEvaluation')}
            </button>
          ) : null}
          <button className="ghost-btn" type="button" onClick={() => openRegistry('decision')}>
            {t('registry.onlyDecision', 'Do decyzji')}
          </button>
          <button className="ghost-btn" type="button" onClick={() => openRegistry('recent')}>
            {t('registry.active72h', 'Aktywne 72h')}
          </button>
        </div>
      </section>

      <section className="dashboard-grid">
        {metrics.map((metric) => (
          <div className="metric-panel premium" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}{metric.suffix || ''}</strong>
            <small>{metric.hint}</small>
          </div>
        ))}
      </section>

      <section className="team-ops-grid">
        <article className="data-panel">
          <div className="section-title">
            <span>{t('dashboard.priority')}</span>
            <small>{t('dashboard.prioritySubtitle')}</small>
          </div>
          <div className="team-focus-grid">
            {teamFocus.length ? teamFocus.map((item) => (
              <button
                className={`team-focus-card ${item.tone}`}
                key={item.label}
                type="button"
                onClick={item.action}
              >
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </button>
            )) : <div className="empty-state compact-empty">{t('team.noUrgentText')}</div>}
          </div>
        </article>

        <article className="data-panel">
          <div className="section-title">
            <span>{t('dashboard.trends')}</span>
            <small>{t('dashboard.trendsSubtitle')}</small>
          </div>
          {trend.length ? (
            <>
              <div className="trend-chart">
                {trend.map((item) => (
                  <div className="trend-column" key={item.period}>
                    <div className="trend-meta">
                      <strong>{item.avg}%</strong>
                      <span>{item.count} {t('dashboard.cards')}</span>
                    </div>
                    <div className="trend-bar" style={{ ['--bar-height' as string]: `${Math.max(10, item.count / trendMaxCount * 100)}%` }}>
                      <i />
                    </div>
                    <div className="trend-label">
                      <span>{item.period}</span>
                      <small>{item.below} {t('dashboard.belowStandard', 'nisko')} - {item.review} {t('registry.onlyDecision', 'decyzji')}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="status-chips">
                <span className="status-chip neutral">{trend.length} {t('dashboard.cards')}</span>
                <span className={`status-chip ${trendDelta !== null && trendDelta >= 0 ? 'success' : 'warning'}`}>
                  {trendDelta !== null ? `${trendDelta >= 0 ? '+' : ''}${trendDelta} pp` : '0 pp'}
                </span>
                <span className="status-chip neutral">{rows.length} {t('team.activeCards')}</span>
              </div>
            </>
          ) : (
            <div className="empty-state compact-empty">{t('team.noCardsInScope')}</div>
          )}
        </article>
      </section>

      <section className="team-ops-grid">
        <article className="data-panel">
          <div className="section-title">
            <span>{t('team.oneToOne')}</span>
            <small>{t('team.oneToOneSubtitle')}</small>
          </div>
          <div className="team-priority-list">
            {prioritySpecialists.length ? prioritySpecialists.map((item) => (
              <button
                className="team-priority-card"
                key={item.specialist.id}
                type="button"
                onClick={() => setSelectedSpecialistProfile(item.specialist.name)}
                disabled={!item.count}
              >
                <div className="team-priority-copy">
                  <strong>{item.specialist.name}</strong>
                  <span>{item.specialist.position} · {item.specialist.department}</span>
                </div>
                <div className="team-priority-meta">
                  {item.pending ? <span><AlertTriangle size={14} /> {item.pending} {t('team.pending')}</span> : null}
                  {item.below ? <span><UserRoundSearch size={14} /> {item.below} {t('team.low')}</span> : null}
                  {!item.last ? <span><TimerReset size={14} /> {t('team.noCards')}</span> : null}
                  {item.last && item.staleDays !== null && item.staleDays > 21 ? <span><TimerReset size={14} /> {item.staleDays} {t('team.daysSince')}</span> : null}
                </div>
              </button>
            )) : <div className="empty-state compact-empty">{t('team.noAttention')}</div>}
          </div>
        </article>

        <article className="data-panel">
          <div className="section-title">
            <span>{t('dashboard.panel.sections.label')}</span>
            <small>{t('dashboard.panel.sections.subtitle')}</small>
          </div>
          <div className="weak-list enhanced">
            {weakSections.length ? weakSections.map((item, index) => (
              <div className="bar-row rich" key={item.label} style={{ ['--row-index' as string]: index }}>
                <span>{item.label}</span>
                <div><i style={{ width: `${item.avg}%` }} /></div>
                <strong>{item.avg}%</strong>
              </div>
            )) : <div className="empty-state compact-empty">{t('team.noCardsInScope')}</div>}
          </div>
          <div className="section-title nested">
            <span>{t('dashboard.panel.weak.label')}</span>
            <small>{t('dashboard.panel.weak.subtitle')}</small>
          </div>
          <div className="weak-list enhanced">
            {weakCriteria.length ? weakCriteria.map((item) => (
              <div className="weak-item" key={item.label}>
                <span>{item.label}</span>
                <strong className={scoreClass(item.avg)}>{item.avg}%</strong>
                <small>{item.count} {t('evaluation.sectionNotesPlaceholder', 'ocen cząstkowych')}</small>
              </div>
            )) : <div className="empty-state compact-empty">{t('team.noCardsInScope')}</div>}
          </div>
        </article>
      </section>

      <section className="data-panel">
        <div className="section-title">
          <span>{t('team.topCards')}</span>
          <small>{t('team.topCardsSubtitle')}</small>
        </div>
        <div className="team-priority-list">
          {queueRows.length ? queueRows.map((item) => (
            <button
              className="team-priority-card"
              key={item.id}
              type="button"
              onClick={() => setSelectedAssessment(item)}
            >
              <div className="team-specialist-head">
                <div>
                  <strong>{item.spec}</strong>
                  <span>{TYPE_LABELS[item.type]} · {item.period} · {item.data}</span>
                </div>
                <span className={scoreClass(item.avgFinal)}>{item.avgFinal}%</span>
              </div>
              <div className="team-priority-meta">
                <span className={`status ${item.status}`}>{statusLabels[item.status]}</span>
                <span>{lastHistoryBy(item) || t('detail.noTimelineAuthor', 'system')}</span>
                <span>{shortDateTime(lastHistoryAt(item))}</span>
              </div>
              <small className="hint-text">{lastHistoryNote(item) || t('detail.noSummary', 'Brak podsumowania końcowego.')}</small>
            </button>
          )) : <div className="empty-state compact-empty">{t('team.noCardsInScope')}</div>}
        </div>
      </section>

      <section className="data-panel">
        <div className="section-title">
          <span>{t('team.members')}</span>
          <small>{specialistRows.length} {t('team.inScope')}</small>
        </div>
        <div className="team-specialist-grid">
          {specialistRows.map((item) => (
            <article className="team-specialist-card" key={item.specialist.id}>
              <div className="team-specialist-head">
                <div>
                  <strong>{item.specialist.name}</strong>
                  <span>{item.specialist.position} · {item.specialist.department}</span>
                </div>
                <span className={item.count ? scoreClass(item.avg) : 'status-chip neutral'}>{item.count ? `${item.avg}%` : t('team.noCards')}</span>
              </div>
              <div className="team-specialist-meta">
                <span>{item.count} {t('team.activeCards')}</span>
                <span>{item.pending} {t('team.pending')}</span>
                <span>{item.below} {t('team.belowStandard', 'poniżej standardu')}</span>
              </div>
              <p className="hint-text">
                {item.last
                  ? `${t('team.lastCard')} ${item.last.data} · ${TYPE_LABELS[item.last.type]} · ${statusLabels[item.last.status]}`
                  : t('team.noCardsInScope')}
              </p>
              <div className="team-specialist-actions">
                <button className="ghost-btn" type="button" onClick={() => setSelectedSpecialistProfile(item.specialist.name)} disabled={!item.count}>
                  <Eye size={15} /> {t('report.detail', 'Profil')}
                </button>
                {canCreateRole(user.role) ? (
                  <button className="ghost-btn" type="button" onClick={() => onStartAssessmentForSpecialist?.(item.specialist.name) || setView('form')}>
                    <Plus size={15} /> {t('team.newCard')}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedSpecialistProfile ? (
        <SpecialistProfileModal
          specialist={selectedSpecialistProfile}
          assessments={rows}
          onStartAssessment={() => onStartAssessmentForSpecialist?.(selectedSpecialistProfile) || setView('form')}
          onClose={() => setSelectedSpecialistProfile(null)}
        />
      ) : null}
      {selectedAssessment ? (
        <AssessmentDetailModal
          assessment={selectedAssessment}
          user={user}
          onClose={() => setSelectedAssessment(null)}
        />
      ) : null}
    </main>
  )
}

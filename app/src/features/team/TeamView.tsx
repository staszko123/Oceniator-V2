import { AlertTriangle, Eye, Plus, TimerReset, UserRoundSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { canCompareLeadersRole, canCreateRole } from '../../domain/access'
import { TYPE_LABELS } from '../../domain/defs'
import type { AdminConfig, Assessment, UserProfile } from '../../domain/types'
import { scoreClass } from '../../lib/display'
import { AssessmentTable } from '../registry/AssessmentTable'
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
  const teamTitle = user.role === 'assessor' ? t('team.assessorTitle', 'Assessor scope') : t('team.title')
  const leaderOptions = useMemo(() => {
    if (canCompareLeadersRole(user.role)) return admin.leaders
    return [user.leaderScope].filter(Boolean)
  }, [admin.leaders, user])
  const [leader, setLeader] = useState(() => leaderOptions[0] || '')
  const [selectedSpecialistProfile, setSelectedSpecialistProfile] = useState<string | null>(null)
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [recentWindow] = useState(() => new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10))
  const activeLeader = leaderOptions.includes(leader) ? leader : leaderOptions[0] || ''

  const specialists = useMemo(() => (
    admin.specialists
      .filter((item) => item.active && (!activeLeader || item.leader === activeLeader))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  ), [admin.specialists, activeLeader])

  const rows = useMemo(() => assessments.filter((item) => (
    item.status !== 'archived'
    && (!activeLeader || item.leaderScope === activeLeader || item.oce === activeLeader)
  )), [assessments, activeLeader])

  const specialistRows = useMemo(() => specialists.map((specialist) => {
    const specialistAssessments = rows.filter((item) => item.spec === specialist.name)
    const recent = [...specialistAssessments].sort((a, b) => b.data.localeCompare(a.data))
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
      needsAttention: pending > 0 || below > 0 || !last || (staleDays !== null && staleDays > 21),
    }
  }), [specialists, rows])

  const avg = rows.length ? Math.round(rows.reduce((acc, item) => acc + item.avgFinal, 0) / rows.length) : 0
  const pending = rows.filter((item) => item.status === 'submitted' || item.status === 'review').length
  const below = rows.filter((item) => item.rating === 'below').length
  const staleSpecialists = specialistRows.filter((item) => !item.last || item.last.data < recentWindow)
  const teamFocus = [
    pending ? { label: t('team.toDecision', 'Kolejka decyzji'), value: pending, hint: 'Karty submitted i review czekają na domknięcie.', tone: 'alert' as const } : null,
    below ? { label: t('team.belowStandard', 'Poniżej standardu'), value: below, hint: 'Przygotuj feedback i plan działań dla słabszych wyników.', tone: 'warning' as const } : null,
    staleSpecialists.length ? { label: t('team.noFreshCard', 'Bez świeżej karty'), value: staleSpecialists.length, hint: 'Część zespołu nie ma oceny z ostatnich 14 dni.', tone: 'neutral' as const } : null,
  ].filter(Boolean) as Array<{ label: string; value: number; hint: string; tone: 'alert' | 'warning' | 'neutral' }>

  const prioritySpecialists = [...specialistRows]
    .filter((item) => item.needsAttention)
    .sort((a, b) => {
      const priorityA = (a.pending * 30) + (a.below * 20) + (a.staleDays && a.staleDays > 21 ? 10 : 0)
      const priorityB = (b.pending * 30) + (b.below * 20) + (b.staleDays && b.staleDays > 21 ? 10 : 0)
      return priorityB - priorityA || a.specialist.name.localeCompare(b.specialist.name, 'pl')
    })
    .slice(0, 6)

  const queueRows = [...rows]
    .sort((a, b) => {
      const priorityA = (a.status === 'review' ? 30 : 0) + (a.rating === 'below' ? 20 : 0) - a.avgFinal
      const priorityB = (b.status === 'review' ? 30 : 0) + (b.rating === 'below' ? 20 : 0) - b.avgFinal
      return priorityB - priorityA
    })
    .slice(0, 10)

  return (
    <main className="screen">
      <section className="team-hero data-panel">
        <div className="team-hero-copy">
          <div className="section-title"><span>{teamTitle}</span><small>{activeLeader || t('team.fullScope', 'Pełny zakres')}</small></div>
          <h1>{t('team.hero')}</h1>
          <p>{t('team.heroHint')}</p>
          <div className="status-chips">
            <span className="status-chip neutral">{specialists.length} {t('team.activeSpecialists')}</span>
            <span className={pending ? 'status-chip' : 'status-chip success'}>{pending ? `${pending} ${t('team.pending', 'kart do decyzji')}` : t('team.noQueue')}</span>
            <span className={below ? 'status-chip' : 'status-chip success'}>{below ? `${below} ${t('team.belowStandard', 'kart poniżej standardu')}` : t('team.noBelow')}</span>
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
          {canCreateRole(user.role) ? <button className="primary-btn" type="button" onClick={() => setView('form')}><Plus size={16} /> {t('team.newEvaluation')}</button> : null}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="metric-panel"><span>{t('team.specialists')}</span><strong>{specialists.length}</strong><small>{t('team.activeScope')}</small></div>
        <div className="metric-panel"><span>{t('team.activeCards')}</span><strong>{rows.length}</strong><small>{t('team.withoutArchive')}</small></div>
        <div className="metric-panel"><span>{t('team.avgScore')}</span><strong>{avg || '-'}%</strong><small>{t('team.forTeam')}</small></div>
        <div className="metric-panel"><span>{t('team.toReact')}</span><strong>{pending + below}</strong><small>{t('team.statusOrScore')}</small></div>
      </section>

      <section className="team-ops-grid">
        <article className="data-panel">
          <div className="section-title"><span>{t('team.priority')}</span><small>{teamFocus.length ? t('team.prioritySubtitle') : t('team.noUrgent')}</small></div>
          <div className="team-focus-grid">
            {teamFocus.length ? teamFocus.map((item) => (
              <button
                className={`team-focus-card ${item.tone}`}
                key={item.label}
                type="button"
                onClick={() => item.label.includes(t('team.toDecision')) ? openRegistry('decision') : undefined}
              >
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </button>
            )) : <div className="empty-state compact-empty">{t('team.noUrgentText')}</div>}
          </div>
        </article>

        <article className="data-panel">
          <div className="section-title"><span>{t('team.oneToOne')}</span><small>{prioritySpecialists.length ? t('team.oneToOneSubtitle') : t('team.noOneToOne')}</small></div>
          <div className="team-priority-list">
            {prioritySpecialists.length ? prioritySpecialists.map((item) => (
              <button className="team-priority-card" key={item.specialist.id} type="button" onClick={() => setSelectedSpecialistProfile(item.specialist.name)}>
                <div>
                  <strong>{item.specialist.name}</strong>
                  <span>{item.specialist.position} • {item.specialist.department}</span>
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
      </section>

      <section className="data-panel">
        <div className="section-title"><span>{t('team.members')}</span><small>{specialistRows.length} {t('team.inScope')}</small></div>
        <div className="team-specialist-grid">
          {specialistRows.map((item) => (
            <article className="team-specialist-card" key={item.specialist.id}>
              <div className="team-specialist-head">
                <div>
                  <strong>{item.specialist.name}</strong>
                  <span>{item.specialist.position} • {item.specialist.department}</span>
                </div>
                <span className={item.count ? scoreClass(item.avg) : 'status-chip neutral'}>{item.count ? `${item.avg}%` : t('team.noCards')}</span>
              </div>
              <div className="team-specialist-meta">
                <span>{item.count} {t('team.activeCards')}</span>
                <span>{item.pending} {t('team.pending')}</span>
                <span>{item.below} {t('team.belowStandard')}</span>
              </div>
              <p className="hint-text">
                {item.last
                  ? `${t('team.lastCard')} ${item.last.data} • ${TYPE_LABELS[item.last.type]} • ${statusLabels[item.last.status]}`
                  : t('team.noCardsInScope')}
              </p>
              <div className="team-specialist-actions">
                <button className="ghost-btn" type="button" onClick={() => setSelectedSpecialistProfile(item.specialist.name)} disabled={!item.count}>
                  <Eye size={15} /> {t('report.profile', 'Profil')}
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

      <section className="data-panel">
        <div className="section-title"><span>{t('team.topCards')}</span><small>{t('team.topCardsSubtitle')}</small></div>
        <AssessmentTable assessments={queueRows} compact onPreview={setSelectedAssessment} />
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

import { AlertTriangle, Eye, Plus, TimerReset, UserRoundSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { canCreateRole } from '../../domain/access'
import { TYPE_LABELS } from '../../domain/defs'
import type { AdminConfig, Assessment, UserProfile } from '../../domain/types'
import { scoreClass } from '../../lib/display'
import { AssessmentTable } from '../registry/AssessmentTable'
import { statusLabels } from '../registry/registryExports'
import { SpecialistProfileModal } from '../specialists/profile'

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
  const leaderOptions = useMemo(() => {
    if (user.role === 'admin' || user.role === 'director') return admin.leaders
    return [user.leaderScope].filter(Boolean)
  }, [admin.leaders, user])
  const [leader, setLeader] = useState(() => leaderOptions[0] || '')
  const [selectedSpecialistProfile, setSelectedSpecialistProfile] = useState<string | null>(null)
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
    pending ? { label: 'Kolejka decyzji', value: pending, hint: 'Karty submitted i review czekaja na domkniecie.', tone: 'alert' as const } : null,
    below ? { label: 'Ponizej standardu', value: below, hint: 'Przygotuj feedback i plan dzialan dla slabszych wynikow.', tone: 'warning' as const } : null,
    staleSpecialists.length ? { label: 'Bez swiezej karty', value: staleSpecialists.length, hint: 'Czesc zespolu nie ma oceny z ostatnich 14 dni.', tone: 'neutral' as const } : null,
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
          <div className="section-title"><span>Moj zespol</span><small>{activeLeader || 'Pelny zakres'}</small></div>
          <h1>Operacyjny widok pracy lidera na jednym ekranie.</h1>
          <p>Najpierw domknij kolejke decyzji, potem sprawdz osoby bez swiezej karty i wejdz prosto do profilu specjalisty bez przeskakiwania po modulach.</p>
          <div className="status-chips">
            <span className="status-chip neutral">{specialists.length} aktywnych specjalistow</span>
            <span className={pending ? 'status-chip' : 'status-chip success'}>{pending ? `${pending} kart do decyzji` : 'Brak kolejki decyzyjnej'}</span>
            <span className={below ? 'status-chip' : 'status-chip success'}>{below ? `${below} kart ponizej standardu` : 'Brak kart ponizej standardu'}</span>
          </div>
        </div>
        <div className="team-actions">
          {leaderOptions.length > 1 ? (
            <label>
              <span>Lider</span>
              <select value={activeLeader} onChange={(event) => setLeader(event.target.value)}>
                {leaderOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          ) : null}
          {canCreateRole(user.role) ? <button className="primary-btn" type="button" onClick={() => setView('form')}><Plus size={16} /> Nowa ocena</button> : null}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="metric-panel"><span>Specjalisci</span><strong>{specialists.length}</strong><small>aktywni w zakresie</small></div>
        <div className="metric-panel"><span>Karty aktywne</span><strong>{rows.length}</strong><small>bez archiwum</small></div>
        <div className="metric-panel"><span>Sredni wynik</span><strong>{avg || '-'}%</strong><small>dla zespolu</small></div>
        <div className="metric-panel"><span>Do reakcji</span><strong>{pending + below}</strong><small>status lub niski wynik</small></div>
      </section>

      <section className="team-ops-grid">
        <article className="data-panel">
          <div className="section-title"><span>Priorytety dnia</span><small>{teamFocus.length ? 'co domknac najpierw' : 'bez pilnych sygnalow'}</small></div>
          <div className="team-focus-grid">
            {teamFocus.length ? teamFocus.map((item) => (
              <button
                className={`team-focus-card ${item.tone}`}
                key={item.label}
                type="button"
                onClick={() => item.label === 'Kolejka decyzji' ? openRegistry('decision') : undefined}
              >
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </button>
            )) : <div className="empty-state compact-empty">Brak pilnych sygnalow. Zespol nie ma zaleglych kart ani slabych wynikow.</div>}
          </div>
        </article>

        <article className="data-panel">
          <div className="section-title"><span>Osoby do rozmowy 1:1</span><small>{prioritySpecialists.length ? 'najwieksze ryzyko lub brak swiezej karty' : 'brak pilnych rozmow'}</small></div>
          <div className="team-priority-list">
            {prioritySpecialists.length ? prioritySpecialists.map((item) => (
              <button className="team-priority-card" key={item.specialist.id} type="button" onClick={() => setSelectedSpecialistProfile(item.specialist.name)}>
                <div>
                  <strong>{item.specialist.name}</strong>
                  <span>{item.specialist.position} • {item.specialist.department}</span>
                </div>
                <div className="team-priority-meta">
                  {item.pending ? <span><AlertTriangle size={14} /> {item.pending} do decyzji</span> : null}
                  {item.below ? <span><UserRoundSearch size={14} /> {item.below} nisko</span> : null}
                  {!item.last ? <span><TimerReset size={14} /> brak kart</span> : null}
                  {item.last && item.staleDays !== null && item.staleDays > 21 ? <span><TimerReset size={14} /> {item.staleDays} dni od ostatniej</span> : null}
                </div>
              </button>
            )) : <div className="empty-state compact-empty">Brak specjalistow wymagajacych pilnego wejscia w profil.</div>}
          </div>
        </article>
      </section>

      <section className="data-panel">
        <div className="section-title"><span>Specjalisci zespolu</span><small>{specialistRows.length} osob w aktywnym zakresie</small></div>
        <div className="team-specialist-grid">
          {specialistRows.map((item) => (
            <article className="team-specialist-card" key={item.specialist.id}>
              <div className="team-specialist-head">
                <div>
                  <strong>{item.specialist.name}</strong>
                  <span>{item.specialist.position} • {item.specialist.department}</span>
                </div>
                <span className={item.count ? scoreClass(item.avg) : 'status-chip neutral'}>{item.count ? `${item.avg}%` : 'Brak kart'}</span>
              </div>
              <div className="team-specialist-meta">
                <span>{item.count} kart</span>
                <span>{item.pending} do decyzji</span>
                <span>{item.below} ponizej standardu</span>
              </div>
              <p className="hint-text">
                {item.last
                  ? `Ostatnia karta: ${item.last.data} • ${TYPE_LABELS[item.last.type]} • ${statusLabels[item.last.status]}`
                  : 'Brak zapisanych kart w aktualnym zakresie.'}
              </p>
              <div className="team-specialist-actions">
                <button className="ghost-btn" type="button" onClick={() => setSelectedSpecialistProfile(item.specialist.name)} disabled={!item.count}>
                  <Eye size={15} /> Profil
                </button>
                {canCreateRole(user.role) ? (
                  <button className="ghost-btn" type="button" onClick={() => onStartAssessmentForSpecialist?.(item.specialist.name) || setView('form')}>
                    <Plus size={15} /> Nowa karta
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="data-panel">
        <div className="section-title"><span>Najpilniejsze karty</span><small>niskie wyniki i otwarta kolejka decyzyjna</small></div>
        <AssessmentTable assessments={queueRows} compact />
      </section>

      {selectedSpecialistProfile ? (
        <SpecialistProfileModal
          specialist={selectedSpecialistProfile}
          assessments={rows}
          onStartAssessment={() => onStartAssessmentForSpecialist?.(selectedSpecialistProfile) || setView('form')}
          onClose={() => setSelectedSpecialistProfile(null)}
        />
      ) : null}
    </main>
  )
}

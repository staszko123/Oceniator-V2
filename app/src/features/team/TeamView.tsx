import { Eye, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TYPE_LABELS } from '../../domain/defs'
import type { AdminConfig, Assessment, UserProfile } from '../../domain/types'
import { AssessmentTable } from '../registry/AssessmentTable'
import { SpecialistProfileModal } from '../specialists/profile'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

function canCreate(user: UserProfile): boolean {
  return ['admin', 'director', 'leader', 'assessor'].includes(user.role)
}

function scoreClass(score: number): string {
  if (score >= 92) return 'score score-great'
  if (score >= 82) return 'score score-good'
  return 'score score-below'
}

export default function TeamView({
  user,
  admin,
  assessments,
  setView,
}: {
  user: UserProfile
  admin: AdminConfig
  assessments: Assessment[]
  setView: (view: ViewKey) => void
}) {
  const leaderOptions = useMemo(() => {
    if (user.role === 'admin' || user.role === 'director') return admin.leaders
    return [user.leaderScope].filter(Boolean)
  }, [admin.leaders, user])
  const [leader, setLeader] = useState(() => leaderOptions[0] || '')
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
  const [selectedSpecialistProfile, setSelectedSpecialistProfile] = useState<string | null>(null)
  const avg = rows.length ? Math.round(rows.reduce((acc, item) => acc + item.avgFinal, 0) / rows.length) : 0
  const pending = rows.filter((item) => item.status === 'submitted' || item.status === 'review').length
  const below = rows.filter((item) => item.rating === 'below').length
  const specialistRows = specialists.map((specialist) => {
    const specialistAssessments = rows.filter((item) => item.spec === specialist.name)
    const last = [...specialistAssessments].sort((a, b) => b.data.localeCompare(a.data))[0]
    return {
      specialist,
      count: specialistAssessments.length,
      avg: specialistAssessments.length
        ? Math.round(specialistAssessments.reduce((acc, item) => acc + item.avgFinal, 0) / specialistAssessments.length)
        : 0,
      last,
    }
  })

  return (
    <main className="screen">
      <section className="team-hero data-panel">
        <div>
          <div className="section-title"><span>Mój zespół</span><small>{activeLeader || 'Pełny zakres'}</small></div>
          <p className="hint-text">Widok operacyjny lidera pokazuje aktywnych specjalistów, ostatnie karty i priorytety do rozmów 1:1.</p>
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
          {canCreate(user) ? <button className="primary-btn" type="button" onClick={() => setView('form')}><Plus size={16} /> Nowa ocena</button> : null}
        </div>
      </section>
      <section className="dashboard-grid">
        <div className="metric-panel"><span>Specjaliści</span><strong>{specialists.length}</strong><small>aktywni w zakresie</small></div>
        <div className="metric-panel"><span>Karty aktywne</span><strong>{rows.length}</strong><small>bez archiwum</small></div>
        <div className="metric-panel"><span>Średni wynik</span><strong>{avg || '-'}%</strong><small>dla zespołu</small></div>
        <div className="metric-panel"><span>Do reakcji</span><strong>{pending + below}</strong><small>status lub niski wynik</small></div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Specjaliści zespołu</span><small>{specialistRows.length} osób</small></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Specjalista</th><th>Stanowisko</th><th>Dział</th><th>Karty</th><th>Średnia</th><th>Ostatnia karta</th><th>Profil</th></tr></thead>
            <tbody>
              {specialistRows.map((item) => (
                <tr key={item.specialist.id}>
                  <td><strong>{item.specialist.name}</strong><small>{item.specialist.leader}</small></td>
                  <td>{item.specialist.position}</td>
                  <td>{item.specialist.department}</td>
                  <td>{item.count}</td>
                  <td>{item.count ? <span className={scoreClass(item.avg)}>{item.avg}%</span> : '-'}</td>
                  <td>{item.last ? `${item.last.data} • ${TYPE_LABELS[item.last.type]}` : 'Brak kart'}</td>
                  <td>
                    <button className="ghost-btn table-inline-btn" type="button" onClick={() => setSelectedSpecialistProfile(item.specialist.name)} disabled={!item.count}>
                      <Eye size={15} /> Profil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Najpilniejsze karty</span><small>niskie wyniki i weryfikacja</small></div>
        <AssessmentTable
          assessments={[...rows]
            .sort((a, b) => {
              const priorityA = (a.status === 'review' ? -20 : 0) + (a.rating === 'below' ? -10 : 0) + a.avgFinal
              const priorityB = (b.status === 'review' ? -20 : 0) + (b.rating === 'below' ? -10 : 0) + b.avgFinal
              return priorityA - priorityB
            })
            .slice(0, 10)}
          compact
        />
      </section>
      {selectedSpecialistProfile ? (
        <SpecialistProfileModal
          specialist={selectedSpecialistProfile}
          assessments={rows}
          onClose={() => setSelectedSpecialistProfile(null)}
        />
      ) : null}
    </main>
  )
}

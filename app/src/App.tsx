import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Database,
  Download,
  Edit3,
  Eye,
  FileBarChart,
  FileText,
  GripVertical,
  LayoutDashboard,
  LogOut,
  Mail,
  Maximize2,
  MonitorCog,
  Moon,
  PanelRight,
  PhoneCall,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  EyeOff,
  RotateCcw,
  TrendingUp,
  Trophy,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { ASSESSMENT_DEFS, SCORE_OPTIONS, TYPE_LABELS } from './domain/defs'
import { assessmentToDraft, calculateDraft, createDraft, draftToAssessment, periodOf, ratingLabel, resizeDraft } from './domain/scoring'
import { buildDemoAdmin } from './data/seed'
import { createProvider } from './data/supabaseProvider'
import type {
  AdminConfig,
  Assessment,
  AssessmentDraft,
  AssessmentPeriod,
  AssessmentStatus,
  AssessmentType,
  DataProvider,
  ManagedUser,
  ScoreValue,
  Specialist,
  UserProfile,
} from './domain/types'
import './index.css'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

const navItems: Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'start', label: 'Start', icon: LayoutDashboard },
  { key: 'form', label: 'Ocena rozmow', icon: PhoneCall },
  { key: 'team', label: 'Moj Zespol', icon: Users },
  { key: 'registry', label: 'Ewidencja', icon: ClipboardCheck },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'reports', label: 'Raporty', icon: FileBarChart },
  { key: 'admin', label: 'Panel admina', icon: Settings },
]

const localDemoAccounts = 'admin/admin123, lider01/lider123, lider02/lider123, lider/lider123, oceniajacy/ocena123, podglad/podglad123'

const statusLabels: Record<AssessmentStatus, string> = {
  submitted: 'Do weryfikacji',
  review: 'W weryfikacji',
  approved: 'Zatwierdzona',
  archived: 'Archiwum',
}

const roleLabels: Record<UserProfile['role'], string> = {
  admin: 'Administrator',
  director: 'Dyrektor',
  leader: 'Lider',
  assessor: 'Oceniajacy',
  viewer: 'Podglad',
}

function canCreate(user: UserProfile): boolean {
  return ['admin', 'director', 'leader', 'assessor'].includes(user.role)
}

function canAdmin(user: UserProfile): boolean {
  return ['admin', 'director'].includes(user.role)
}

function availableNavItems(user: UserProfile): typeof navItems {
  return navItems.filter((item) => {
    if (item.key === 'form') return canCreate(user)
    if (item.key === 'team') return ['admin', 'director', 'leader', 'assessor'].includes(user.role)
    if (item.key === 'admin') return canAdmin(user)
    return true
  })
}

function scopedAssessments(assessments: Assessment[], user: UserProfile): Assessment[] {
  if (user.role === 'admin' || user.role === 'director') return assessments
  return assessments.filter((item) => item.leaderScope === user.leaderScope || item.oce === user.leaderScope)
}

function scoreClass(score: number): string {
  if (score >= 92) return 'score score-great'
  if (score >= 82) return 'score score-good'
  return 'score score-below'
}

function typeIcon(type: AssessmentType) {
  if (type === 'r') return <PhoneCall size={15} />
  if (type === 'm') return <Mail size={15} />
  return <MonitorCog size={15} />
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function readableError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
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

function exportCsv(rows: Assessment[]) {
  const header = ['Specjalista', 'Stanowisko', 'Dzial', 'Typ', 'Okres', 'Data', 'Oceniajacy', 'Wynik', 'Ocena', 'Status']
  const body = rows.map((item) => [
    item.spec,
    item.stand,
    item.dzial,
    TYPE_LABELS[item.type],
    item.period,
    item.data,
    item.oce,
    item.avgFinal,
    ratingLabel(item.rating),
    statusLabels[item.status],
  ])
  const csv = `\uFEFF${[header, ...body].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
  downloadFile('oceniator-ewidencja.csv', 'text/csv;charset=utf-8', csv)
}

function exportJson(rows: Assessment[]) {
  downloadFile('oceniator-ewidencja.json', 'application/json;charset=utf-8', JSON.stringify(rows, null, 2))
}

function exportExcel(rows: Assessment[]) {
  const header = ['Specjalista', 'Stanowisko', 'Dzial', 'Typ', 'Okres', 'Data', 'Oceniajacy', 'Wynik', 'Ocena', 'Status']
  const tableRows = rows.map((item) => [
    item.spec,
    item.stand,
    item.dzial,
    TYPE_LABELS[item.type],
    item.period,
    item.data,
    item.oce,
    `${item.avgFinal}%`,
    ratingLabel(item.rating),
    statusLabels[item.status],
  ])
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${header
    .map((item) => `<th>${esc(item)}</th>`)
    .join('')}</tr></thead><tbody>${tableRows
    .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></body></html>`
  downloadFile('oceniator-ewidencja.xls', 'application/vnd.ms-excel;charset=utf-8', html)
}

function printAssessment(assessment: Assessment): boolean {
  const def = ASSESSMENT_DEFS[assessment.type]
  const sections = def.sections.map((section) => {
    const rows = section.criteria.map((criterion, criterionIndex) => {
      const cells = Array.from({ length: assessment.contactCount }, (_, contactIndex) => {
        const value = assessment.snapshotScores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
        return `<td><strong>${value === 'nd' ? 'N/D' : value}</strong></td>`
      }).join('')
      return `<tr><td>${esc(criterion.name)}</td>${cells}</tr>`
    }).join('')
    const headings = Array.from({ length: assessment.contactCount }, (_, index) => `<th>${esc(def.contactLabel)} ${index + 1}</th>`).join('')
    return `<section><h2>${esc(section.label)} <small>waga ${Math.round(section.weight * 100)}%</small></h2><table><thead><tr><th>Kryterium</th>${headings}</tr></thead><tbody>${rows}</tbody></table></section>`
  }).join('')

  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${esc(def.name)} - ${esc(assessment.spec)}</title><style>
    body{font-family:Arial,sans-serif;margin:0;color:#0f172a;background:#fff}
    .page{max-width:1100px;margin:0 auto;padding:28px}
    header{background:#0b1c32;color:#fff;padding:18px 22px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;gap:18px}
    h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:20px 0 0;background:#0f766e;color:#fff;padding:10px 12px;border-radius:8px 8px 0 0}
    small{opacity:.72}.meta{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}.meta div{border:1px solid #dce6ef;padding:10px;border-radius:6px}
    .meta span{display:block;color:#64748b;font-size:10px;text-transform:uppercase;font-weight:700}.meta strong{font-size:12px}
    table{width:100%;border-collapse:collapse;border:1px solid #dce6ef}th,td{border-bottom:1px solid #dce6ef;padding:8px;text-align:left;font-size:12px}th{background:#f7fafc;color:#64748b;text-transform:uppercase;font-size:10px}
    .result{font-size:38px;font-weight:900;color:#16a34a}.notes{white-space:pre-wrap;border:1px solid #dce6ef;border-radius:6px;padding:12px;margin-top:16px}
    .nopr{position:sticky;top:0;background:#07111f;padding:10px;text-align:right}.nopr button{background:#0f8f87;color:#fff;border:0;border-radius:6px;padding:9px 14px;font-weight:700}
    @media print{.nopr{display:none}.page{padding:12mm}header{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body><div class="nopr"><button onclick="window.print()">Drukuj / Zapisz PDF</button></div><div class="page">
    <header><div><h1>${esc(def.name)}</h1><small>System Oceny Jakosci PeP & P24</small></div><div class="result">${assessment.avgFinal}%</div></header>
    <div class="meta">
      <div><span>Specjalista</span><strong>${esc(assessment.spec)}</strong></div>
      <div><span>Stanowisko</span><strong>${esc(assessment.stand)}</strong></div>
      <div><span>Dzial</span><strong>${esc(assessment.dzial)}</strong></div>
      <div><span>Oceniajacy</span><strong>${esc(assessment.oce)}</strong></div>
      <div><span>Data</span><strong>${esc(assessment.data)}</strong></div>
    </div>
    ${sections}
    <div class="notes"><strong>Podsumowanie:</strong><br>${esc(assessment.notes || 'Brak uwag.')}</div>
  </div></body></html>`

  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  return true
}

function LoginScreen({
  provider,
  onLogin,
  onLocalDemo,
}: {
  provider: DataProvider
  onLogin: (login: string, password: string) => Promise<void>
  onLocalDemo: () => Promise<void>
}) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(login, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie zalogowac.')
    } finally {
      setBusy(false)
    }
  }

  async function startLocalDemo() {
    setBusy(true)
    setError('')
    try {
      await onLocalDemo()
    } catch (err) {
      setError(readableError(err, 'Nie udalo sie uruchomic lokalnego demo.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand-mark">
          <span />
          <div>
            <strong>Oceniator</strong>
            <small>PeP & P24 Quality Suite</small>
          </div>
        </div>
        <h1>Desktopowe centrum oceny jakosci</h1>
        <p>
          Nowy interfejs laczy formularze, ewidencje, raporty i admina w jednym spokojnym,
          SaaSowym ukladzie z prawym panelem wynikow.
        </p>
        <div className="login-proof">
          <div><ShieldCheck size={18} /> Role i zakresy</div>
          <div><Database size={18} /> Supabase albo demo lokalne</div>
          <div><PanelRight size={18} /> Panele przypiete po prawej</div>
        </div>
      </section>
      <section className="login-card">
        <div className="section-title">
          <span>{provider.mode === 'supabase' ? 'Logowanie Supabase' : 'Tryb lokalny'}</span>
          <small>{provider.mode === 'supabase' ? 'Konta produkcyjne' : 'Konta demo'}</small>
        </div>
        <form onSubmit={submit} className="stack">
          <label>
            <span>{provider.mode === 'supabase' ? 'Email' : 'Login'}</span>
            <input value={login} onChange={(event) => setLogin(event.target.value)} autoFocus />
          </label>
          <label>
            <span>Haslo</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <div className="error-box">{error}</div> : null}
          <button className="primary-btn" disabled={busy} type="submit">
            {busy ? 'Logowanie...' : 'Wejdz do aplikacji'}
          </button>
        </form>
        <button className="ghost-btn wide" type="button" disabled={busy} onClick={() => void startLocalDemo()}>
          Uruchom lokalne demo jako admin
        </button>
        <p className="hint-text">Konta demo: {localDemoAccounts}.</p>
      </section>
    </main>
  )
}

function AppShell({
  user,
  providerMode,
  view,
  setView,
  children,
  onLogout,
  systemNotice,
}: {
  user: UserProfile
  providerMode: DataProvider['mode']
  view: ViewKey
  setView: (view: ViewKey) => void
  children: React.ReactNode
  onLogout: () => void
  systemNotice?: string
}) {
  const visibleNavItems = availableNavItems(user)
  const activeTitle = visibleNavItems.find((item) => item.key === view)?.label || 'Oceniator'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="logo-box" />
          <div>
            <strong>Ocena Jakosci</strong>
            <small>PeP & P24</small>
          </div>
        </div>
        <nav className="side-nav">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            return (
              <button key={item.key} className={view === item.key ? 'active' : ''} onClick={() => setView(item.key)} type="button">
                <Icon size={17} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="mode-chip"><Moon size={14} /> Motyw premium</div>
          <div className="mode-chip"><Database size={14} /> {providerMode === 'supabase' ? 'Supabase' : 'Local demo'}</div>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            <h2>{activeTitle}</h2>
            <p>{user.fullName} · {user.role}</p>
          </div>
          <div className="user-pill">
            <UserRound size={15} />
            <span>{user.email}</span>
            <button type="button" onClick={onLogout}><LogOut size={15} /> Wyloguj</button>
          </div>
        </header>
        {systemNotice ? <div className="system-notice">{systemNotice}</div> : null}
        {children}
      </section>
      <div className="desktop-guard">
        <MonitorCog size={44} />
        <h1>Aplikacja wymaga wiekszego ekranu</h1>
        <p>Nowy Oceniator jest projektowany tylko pod desktop. Uzyj szerokosci minimum 1280 px.</p>
      </div>
    </div>
  )
}

function StartView({
  user,
  assessments,
  setView,
}: {
  user: UserProfile
  assessments: Assessment[]
  setView: (view: ViewKey) => void
}) {
  const active = assessments.filter((item) => item.status !== 'archived')
  const avg = active.length ? Math.round(active.reduce((acc, item) => acc + item.avgFinal, 0) / active.length) : 0
  const review = active.filter((item) => item.status === 'review').length

  return (
    <main className="screen">
      <section className="start-grid">
        <div className="hero-panel">
        <div className="section-title"><span>Dzisiejszy pulpit</span><small>{new Date().toLocaleDateString('pl-PL')}</small></div>
        <h1>Wybierz workflow i pracuj z jednym przypietym panelem decyzyjnym.</h1>
        <div className="quick-actions">
            {canCreate(user) ? <button className="primary-btn" onClick={() => setView('form')} type="button"><Plus size={16} /> Nowa ocena</button> : null}
            <button className="ghost-btn" onClick={() => setView('registry')} type="button"><ClipboardCheck size={16} /> Ewidencja</button>
            <button className="ghost-btn" onClick={() => setView('reports')} type="button"><FileText size={16} /> Raport</button>
          </div>
        </div>
        <div className="metric-panel"><span>Karty aktywne</span><strong>{active.length}</strong><small>dla zakresu: {user.role}</small></div>
        <div className="metric-panel"><span>Sredni wynik</span><strong>{avg || '-'}%</strong><small>cel minimum 92%</small></div>
        <div className="metric-panel"><span>W weryfikacji</span><strong>{review}</strong><small>wymagaja decyzji</small></div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Ostatnie karty</span><small>Top 8</small></div>
        <AssessmentTable assessments={active.slice(0, 8)} compact />
      </section>
    </main>
  )
}

function TeamView({
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
          <div className="section-title"><span>Moj Zespol</span><small>{activeLeader || 'Pelny zakres'}</small></div>
          <p className="hint-text">Widok operacyjny lidera pokazuje aktywnych specjalistow, ostatnie karty i priorytety do rozmow 1:1.</p>
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
        <div className="metric-panel"><span>Specjalisci</span><strong>{specialists.length}</strong><small>aktywni w zakresie</small></div>
        <div className="metric-panel"><span>Karty aktywne</span><strong>{rows.length}</strong><small>bez archiwum</small></div>
        <div className="metric-panel"><span>Sredni wynik</span><strong>{avg || '-'}%</strong><small>dla zespolu</small></div>
        <div className="metric-panel"><span>Do reakcji</span><strong>{pending + below}</strong><small>status lub niski wynik</small></div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Specjalisci zespolu</span><small>{specialistRows.length} osob</small></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Specjalista</th><th>Stanowisko</th><th>Dzial</th><th>Karty</th><th>Srednia</th><th>Ostatnia karta</th></tr></thead>
            <tbody>
              {specialistRows.map((item) => (
                <tr key={item.specialist.id}>
                  <td><strong>{item.specialist.name}</strong><small>{item.specialist.leader}</small></td>
                  <td>{item.specialist.position}</td>
                  <td>{item.specialist.department}</td>
                  <td>{item.count}</td>
                  <td>{item.count ? <span className={scoreClass(item.avg)}>{item.avg}%</span> : '-'}</td>
                  <td>{item.last ? `${item.last.data} · ${TYPE_LABELS[item.last.type]}` : 'Brak kart'}</td>
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
    </main>
  )
}

function EvaluationView({
  user,
  admin,
  draft,
  onDraftChange,
  onSaveAssessment,
}: {
  user: UserProfile
  admin: AdminConfig
  draft: AssessmentDraft
  onDraftChange: (draft: AssessmentDraft) => void
  onSaveAssessment: (draft: AssessmentDraft) => Promise<void>
}) {
  const [type, setType] = useState<AssessmentType>(draft.type)
  const [saveState, setSaveState] = useState('')
  const def = ASSESSMENT_DEFS[draft.type]
  const calculated = useMemo(() => calculateDraft(draft), [draft])
  const specialists = useMemo(() => {
    if (user.role === 'admin' || user.role === 'director') return admin.specialists.filter((item) => item.active)
    return admin.specialists.filter((item) => item.active && item.leader === user.leaderScope)
  }, [admin.specialists, user])

  function update(next: AssessmentDraft) {
    onDraftChange({ ...next, savedAt: new Date().toISOString() })
    setSaveState(`Szkic zapisany ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`)
  }

  function updateField(field: keyof AssessmentDraft, value: AssessmentDraft[keyof AssessmentDraft]) {
    update({ ...draft, [field]: value })
  }

  function selectSpecialist(name: string) {
    const person = specialists.find((item) => item.name === name)
    update({
      ...draft,
      specialist: name,
      position: person?.position || draft.position,
      department: person?.department || draft.department,
      assessor: person?.leader || draft.assessor || user.leaderScope,
    })
  }

  function setScore(sectionKey: string, criterionIndex: number, contactIndex: number, value: ScoreValue) {
    const scores = structuredClone(draft.scores)
    scores[sectionKey][criterionIndex][contactIndex] = value
    update({ ...draft, scores })
  }

  function setSectionNote(sectionKey: string, contactIndex: number, value: string) {
    const notes = structuredClone(draft.notes)
    notes[sectionKey][contactIndex] = value
    update({ ...draft, notes })
  }

  async function submit() {
    if (!draft.specialist.trim()) {
      setSaveState('Wybierz specjaliste przed zapisem.')
      return
    }
    if (!draft.contactIds.some(Boolean)) {
      setSaveState('Uzupelnij co najmniej jeden identyfikator kontaktu.')
      return
    }
    try {
      await onSaveAssessment(draft)
      setSaveState('Karta dodana do ewidencji.')
    } catch (error) {
      setSaveState(readableError(error, 'Nie udalo sie zapisac karty.'))
    }
  }

  return (
    <main className="screen form-screen">
      <section className="form-main">
        <div className="type-tabs">
          {(Object.keys(ASSESSMENT_DEFS) as AssessmentType[]).map((item) => (
            <button
              key={item}
              className={draft.type === item ? 'active' : ''}
              onClick={() => {
                setType(item)
                if (item !== draft.type) onDraftChange(createDraft(item))
              }}
              type="button"
            >
              {typeIcon(item)} {TYPE_LABELS[item]}
            </button>
          ))}
        </div>
        <div className="form-card meta-card">
          <div className="field-grid">
            <label>
              <span>Specjalista</span>
              <input list="specialists" value={draft.specialist} onChange={(event) => selectSpecialist(event.target.value)} placeholder="Zacznij wpisywac..." />
              <datalist id="specialists">
                {specialists.map((item) => <option key={item.id} value={item.name} />)}
              </datalist>
            </label>
            <label>
              <span>Data oceny</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => update({ ...draft, date: event.target.value, period: periodOf(event.target.value) })}
              />
            </label>
            <label>
              <span>Stanowisko</span>
              <input value={draft.position} onChange={(event) => updateField('position', event.target.value)} />
            </label>
            <label>
              <span>Dzial</span>
              <input value={draft.department} onChange={(event) => updateField('department', event.target.value)} />
            </label>
          </div>
          <div className="contact-strip">
            <span>Liczba {def.pluralLabel}</span>
            <button type="button" onClick={() => update(resizeDraft(draft, draft.contactCount - 1))}>-</button>
            <strong>{draft.contactCount}</strong>
            <button type="button" onClick={() => update(resizeDraft(draft, draft.contactCount + 1))}>+</button>
            <em>{draft.period}</em>
          </div>
          <div className="contact-ids" style={{ gridTemplateColumns: `repeat(${draft.contactCount}, minmax(0, 1fr))` }}>
            {draft.contactIds.map((value, index) => (
              <label key={index}>
                <span>{def.contactLabel} {index + 1}</span>
                <input
                  value={value}
                  onChange={(event) => {
                    const contactIds = [...draft.contactIds]
                    contactIds[index] = event.target.value
                    update({ ...draft, contactIds })
                  }}
                  placeholder="ID / numer sprawy"
                />
              </label>
            ))}
          </div>
        </div>
        {def.sections.map((section) => (
          <section className="score-section" key={section.key}>
            <header>
              <h3>{section.label}</h3>
              <span>waga {Math.round(section.weight * 100)}%</span>
            </header>
            <table className="score-table">
              <thead>
                <tr>
                  <th>Kryterium</th>
                  {Array.from({ length: draft.contactCount }, (_, index) => <th key={index}>{def.contactLabel} {index + 1}</th>)}
                </tr>
              </thead>
              <tbody>
                {section.criteria.map((criterion, criterionIndex) => (
                  <tr key={criterion.name}>
                    <td>
                      <strong>{criterion.name}</strong>
                      <small>{criterion.hint}</small>
                    </td>
                    {Array.from({ length: draft.contactCount }, (_, contactIndex) => {
                      const current = draft.scores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
                      return (
                        <td key={contactIndex}>
                          <div className="score-buttons">
                            {SCORE_OPTIONS.map((option) => (
                              <button
                                key={option.label}
                                className={current === option.value ? 'selected' : ''}
                                onClick={() => setScore(section.key, criterionIndex, contactIndex, option.value)}
                                title={option.title}
                                type="button"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="notes-row">
                  <td>Uwagi do sekcji</td>
                  {Array.from({ length: draft.contactCount }, (_, contactIndex) => (
                    <td key={contactIndex}>
                      <textarea
                        value={draft.notes[section.key]?.[contactIndex] ?? ''}
                        onChange={(event) => setSectionNote(section.key, contactIndex, event.target.value)}
                        placeholder="Uwagi..."
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        ))}
        <section className="form-card">
          <div className="field-grid two">
            <label>
              <span>Zlote punkty</span>
              <div className="gold-row">
                {draft.gold.map((value, index) => (
                  <select
                    key={index}
                    value={value}
                    onChange={(event) => {
                      const gold = [...draft.gold]
                      gold[index] = Number(event.target.value)
                      update({ ...draft, gold })
                    }}
                  >
                    <option value={0}>{def.contactLabel} {index + 1}: 0</option>
                    <option value={0.5}>{def.contactLabel} {index + 1}: +0,5</option>
                    <option value={1}>{def.contactLabel} {index + 1}: +1</option>
                  </select>
                ))}
              </div>
            </label>
            <label>
              <span>Opis / podsumowanie</span>
              <textarea value={draft.summary} onChange={(event) => updateField('summary', event.target.value)} placeholder="Wnioski i plan dzialania..." />
            </label>
          </div>
        </section>
      </section>
      <aside className="right-rail">
        <section className="rail-card">
          <div className="section-title"><span>Akcje</span><small>{saveState}</small></div>
          <button className="primary-btn wide" onClick={submit} disabled={!canCreate(user)} type="button"><Save size={16} /> Dodaj karte</button>
          <button className="ghost-btn wide" onClick={() => update(createDraft(type))} type="button"><Trash2 size={16} /> Wyczysc szkic</button>
        </section>
        <section className="rail-card result-card">
          <div className="section-title"><span>Wynik koncowy</span><small>{ratingLabel(calculated.rating)}</small></div>
          <div className={scoreClass(calculated.avgFinal)}>{calculated.avgFinal}%</div>
          {calculated.results.map((result, index) => (
            <div className="mini-result" key={index}>
              <span>{def.contactLabel} {index + 1}</span>
              <strong>{result.pct}%</strong>
              <small>{result.pts.sum} / {result.pts.max} pkt</small>
            </div>
          ))}
        </section>
        <section className="rail-card">
          <div className="section-title"><span>Kontekst</span><small>{draft.specialist || 'Brak specjalisty'}</small></div>
          <p className="hint-text">Panel pozostaje przypiety po prawej stronie i nie nachodzi na formularz.</p>
        </section>
      </aside>
    </main>
  )
}

function AssessmentTable({
  assessments,
  compact = false,
  onPreview,
  onPrint,
  onEdit,
  onAdvance,
}: {
  assessments: Assessment[]
  compact?: boolean
  onPreview?: (assessment: Assessment) => void
  onPrint?: (assessment: Assessment) => void
  onEdit?: (assessment: Assessment) => void
  onAdvance?: (assessment: Assessment) => void
}) {
  if (!assessments.length) return <div className="empty-state">Brak danych dla aktualnych filtrow.</div>
  const hasActions = Boolean(onPreview || onPrint || onEdit || onAdvance)
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Specjalista</th>
            <th>Typ</th>
            <th>Okres</th>
            <th>Data</th>
            {!compact ? <th>Oceniajacy</th> : null}
            <th>Wynik</th>
            <th>Status</th>
            {hasActions ? <th>Akcje</th> : null}
          </tr>
        </thead>
        <tbody>
          {assessments.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.spec}</strong><small>{item.dzial}</small></td>
              <td><span className="type-badge">{typeIcon(item.type)} {TYPE_LABELS[item.type]}</span></td>
              <td>{item.period}</td>
              <td>{item.data}</td>
              {!compact ? <td>{item.oce}</td> : null}
              <td><span className={scoreClass(item.avgFinal)}>{item.avgFinal}%</span></td>
              <td><span className={`status ${item.status}`}>{statusLabels[item.status]}</span></td>
              {hasActions ? (
                <td>
                  <div className="table-actions">
                    {onPreview ? <button type="button" onClick={() => onPreview(item)} title="Podglad"><Eye size={15} /></button> : null}
                    {onPrint ? <button type="button" onClick={() => onPrint(item)} title="Drukuj"><FileText size={15} /></button> : null}
                    {onEdit ? <button type="button" onClick={() => onEdit(item)} title="Edytuj"><Edit3 size={15} /></button> : null}
                    {onAdvance ? <button type="button" onClick={() => onAdvance(item)} title="Zmien status"><ShieldCheck size={15} /></button> : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AssessmentPreviewModal({
  assessment,
  onClose,
  onPrint,
}: {
  assessment: Assessment
  onClose: () => void
  onPrint: (assessment: Assessment) => void
}) {
  const def = ASSESSMENT_DEFS[assessment.type]
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-card preview-modal">
        <header className="modal-header">
          <div>
            <h3>{def.name}</h3>
            <p>{assessment.spec} · {assessment.period} · {statusLabels[assessment.status]}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="preview-grid">
          <div><span>Stanowisko</span><strong>{assessment.stand || '-'}</strong></div>
          <div><span>Dzial</span><strong>{assessment.dzial || '-'}</strong></div>
          <div><span>Oceniajacy</span><strong>{assessment.oce || '-'}</strong></div>
          <div><span>Data</span><strong>{assessment.data}</strong></div>
          <div><span>Wynik</span><strong className={scoreClass(assessment.avgFinal)}>{assessment.avgFinal}%</strong></div>
        </div>
        <div className="preview-sections">
          {def.sections.map((section) => (
            <section key={section.key}>
              <h4>{section.label}</h4>
              {section.criteria.map((criterion, criterionIndex) => (
                <div className="preview-row" key={criterion.name}>
                  <span>{criterion.name}</span>
                  <div>
                    {Array.from({ length: assessment.contactCount }, (_, contactIndex) => {
                      const value = assessment.snapshotScores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
                      return <strong key={contactIndex}>{value === 'nd' ? 'N/D' : value}</strong>
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
        <div className="status-timeline">
          <h4>Historia statusu</h4>
          {(assessment.statusHistory || []).length ? assessment.statusHistory.map((item, index) => (
            <div className="timeline-item" key={`${item.status}-${item.at}-${index}`}>
              <strong>{statusLabels[item.status]}</strong>
              <span>{new Date(item.at).toLocaleString('pl-PL')} · {item.by || 'system'}</span>
              <small>{item.note}</small>
            </div>
          )) : <p className="hint-text">Brak zapisanej historii statusow dla tej karty.</p>}
        </div>
        <footer className="modal-footer">
          <button className="ghost-btn" type="button" onClick={() => onPrint(assessment)}><FileText size={16} /> Drukuj / PDF</button>
          <button className="primary-btn" type="button" onClick={onClose}>Zamknij</button>
        </footer>
      </section>
    </div>
  )
}

function AssessmentEditModal({
  assessment,
  onClose,
  onSave,
}: {
  assessment: Assessment
  onClose: () => void
  onSave: (assessment: Assessment) => Promise<void>
}) {
  const [draft, setDraft] = useState(() => assessmentToDraft(assessment))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const def = ASSESSMENT_DEFS[draft.type]
  const calculated = useMemo(() => calculateDraft(draft), [draft])

  function setScore(sectionKey: string, criterionIndex: number, contactIndex: number, value: ScoreValue) {
    const scores = structuredClone(draft.scores)
    scores[sectionKey][criterionIndex][contactIndex] = value
    setDraft({ ...draft, scores })
  }

  function setSectionNote(sectionKey: string, contactIndex: number, value: string) {
    const notes = structuredClone(draft.notes)
    notes[sectionKey][contactIndex] = value
    setDraft({ ...draft, notes })
  }

  async function save() {
    setBusy(true)
    setError('')
    try {
      const recalculated = draftToAssessment(draft, assessment.leaderScope || draft.assessor)
      await onSave({
        ...recalculated,
        id: assessment.id,
        status: assessment.status,
        statusHistory: assessment.statusHistory || [],
        createdAt: assessment.createdAt,
        leaderScope: assessment.leaderScope,
      })
      onClose()
    } catch (err) {
      setError(readableError(err, 'Nie udalo sie zapisac zmian w karcie.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-card edit-modal">
        <header className="modal-header">
          <div>
            <h3>Edytuj karte</h3>
            <p>{assessment.spec} · wynik po zmianach {calculated.avgFinal}%</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>
        {error ? <div className="error-box modal-error">{error}</div> : null}
        <div className="field-grid two">
          <label><span>Specjalista</span><input value={draft.specialist} onChange={(event) => setDraft({ ...draft, specialist: event.target.value })} /></label>
          <label><span>Data</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value, period: periodOf(event.target.value) })} /></label>
          <label><span>Stanowisko</span><input value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })} /></label>
          <label><span>Dzial</span><input value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} /></label>
        </div>
        <div className="edit-contact-grid" style={{ gridTemplateColumns: `repeat(${draft.contactCount}, minmax(0, 1fr))` }}>
          {draft.contactIds.map((contactId, index) => (
            <label key={index}>
              <span>{def.contactLabel} {index + 1}</span>
              <input
                value={contactId}
                onChange={(event) => {
                  const contactIds = [...draft.contactIds]
                  contactIds[index] = event.target.value
                  setDraft({ ...draft, contactIds })
                }}
              />
            </label>
          ))}
        </div>
        <div className="edit-sections">
          {def.sections.map((section) => (
            <section key={section.key}>
              <h4>{section.label}</h4>
              {section.criteria.map((criterion, criterionIndex) => (
                <div className="edit-row" key={criterion.name}>
                  <span>{criterion.name}</span>
                  {Array.from({ length: draft.contactCount }, (_, contactIndex) => {
                    const current = draft.scores[section.key]?.[criterionIndex]?.[contactIndex] ?? 1
                    return (
                      <div className="score-buttons" key={contactIndex}>
                        {SCORE_OPTIONS.map((option) => (
                          <button
                            key={option.label}
                            className={current === option.value ? 'selected' : ''}
                            onClick={() => setScore(section.key, criterionIndex, contactIndex, option.value)}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
              <div className="edit-note-grid" style={{ gridTemplateColumns: `repeat(${draft.contactCount}, minmax(0, 1fr))` }}>
                {Array.from({ length: draft.contactCount }, (_, contactIndex) => (
                  <label key={contactIndex}>
                    <span>Uwagi {def.contactLabel.toLowerCase()} {contactIndex + 1}</span>
                    <textarea
                      value={draft.notes[section.key]?.[contactIndex] || ''}
                      onChange={(event) => setSectionNote(section.key, contactIndex, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="edit-gold-panel">
          <div className="gold-row">
            {draft.gold.map((value, index) => (
              <select
                key={index}
                value={value}
                onChange={(event) => {
                  const gold = [...draft.gold]
                  gold[index] = Number(event.target.value)
                  setDraft({ ...draft, gold })
                }}
              >
                <option value={0}>{def.contactLabel} {index + 1}: 0</option>
                <option value={0.5}>{def.contactLabel} {index + 1}: +0,5</option>
                <option value={1}>{def.contactLabel} {index + 1}: +1</option>
              </select>
            ))}
          </div>
          <label>
            <span>Opis zlotych punktow</span>
            <textarea value={draft.goldDescription} onChange={(event) => setDraft({ ...draft, goldDescription: event.target.value })} />
          </label>
        </div>
        <label className="summary-editor">
          <span>Podsumowanie</span>
          <textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
        </label>
        <footer className="modal-footer">
          <button className="ghost-btn" type="button" onClick={onClose}>Anuluj</button>
          <button className="primary-btn" type="button" disabled={busy} onClick={save}><Save size={16} /> Zapisz zmiany</button>
        </footer>
      </section>
    </div>
  )
}

function RegistryView({
  assessments,
  user,
  onUpdate,
  onBulkImport,
}: {
  assessments: Assessment[]
  user: UserProfile
  onUpdate: (assessment: Assessment) => Promise<void>
  onBulkImport: (assessments: Assessment[]) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<AssessmentType | 'all'>('all')
  const [status, setStatus] = useState<AssessmentStatus | 'all'>('all')
  const [period, setPeriod] = useState('all')
  const [selected, setSelected] = useState<Assessment | null>(null)
  const [editing, setEditing] = useState<Assessment | null>(null)
  const [notice, setNotice] = useState('')
  const canMutate = canCreate(user)
  const rows = useMemo(() => assessments.filter((item) => {
    const matchesQuery = `${item.spec} ${item.dzial} ${item.oce}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery
      && (type === 'all' || item.type === type)
      && (status === 'all' || item.status === status)
      && (period === 'all' || item.period === period)
  }), [assessments, period, query, status, type])
  const periods = useMemo(() => uniqueSorted(assessments.map((item) => item.period)), [assessments])

  async function advance(item: Assessment) {
    if (!canMutate) {
      setNotice('Ta rola ma tylko dostep do odczytu.')
      return
    }
    const next: Record<AssessmentStatus, AssessmentStatus> = {
      submitted: 'review',
      review: 'approved',
      approved: 'archived',
      archived: 'submitted',
    }
    const status = next[item.status]
    try {
      await onUpdate({
        ...item,
        status,
        statusHistory: [
          ...(item.statusHistory || []),
          { status, at: new Date().toISOString(), by: user.fullName || user.email, note: 'Zmiana statusu z ewidencji' },
        ],
      })
      setNotice(`Status zmieniony na: ${statusLabels[status]}.`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udalo sie zmienic statusu.'))
    }
  }

  async function importJson(file: File | undefined) {
    if (!file) return
    if (!canMutate) {
      setNotice('Import jest zablokowany dla roli podgladu.')
      return
    }
    setNotice('')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Assessment[]
      if (!Array.isArray(parsed)) throw new Error('Plik JSON musi zawierac tablice kart.')
      const valid = parsed.filter((item) => item && item.id && item.type && item.spec && item.snapshotScores)
      if (!valid.length) throw new Error('Nie znaleziono poprawnych kart do importu.')
      await onBulkImport(valid)
      setNotice(`Zaimportowano ${valid.length} kart.`)
    } catch (error) {
      setNotice(readableError(error, 'Import nie powiodl sie.'))
    }
  }

  function exportRows(kind: 'csv' | 'excel' | 'json') {
    try {
      if (kind === 'csv') exportCsv(rows)
      if (kind === 'excel') exportExcel(rows)
      if (kind === 'json') exportJson(rows)
      setNotice(`Eksport ${kind.toUpperCase()} przygotowany dla ${rows.length} pozycji.`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udalo sie przygotowac eksportu.'))
    }
  }

  function printRow(item: Assessment) {
    if (!printAssessment(item)) setNotice('Przegladarka zablokowala nowe okno drukowania/PDF.')
  }

  return (
    <main className="screen">
      <section className="toolbar-panel">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj specjalisty, dzialu lub oceniajacego" /></label>
        <select value={type} onChange={(event) => setType(event.target.value as AssessmentType | 'all')}>
          <option value="all">Wszystkie typy</option>
          <option value="r">Rozmowy</option>
          <option value="m">Maile</option>
          <option value="s">Systemy</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as AssessmentStatus | 'all')}>
          <option value="all">Wszystkie statusy</option>
          {(Object.keys(statusLabels) as AssessmentStatus[]).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
        </select>
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="all">Wszystkie okresy</option>
          {periods.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="ghost-btn" type="button" onClick={() => exportRows('csv')}><Download size={16} /> CSV</button>
        <button className="ghost-btn" type="button" onClick={() => exportRows('excel')}><Download size={16} /> Excel</button>
        <button className="ghost-btn" type="button" onClick={() => exportRows('json')}><Download size={16} /> JSON</button>
        <label className="ghost-btn import-btn">
          <Upload size={16} /> Import JSON
          <input disabled={!canMutate} type="file" accept="application/json,.json" onChange={(event) => void importJson(event.target.files?.[0])} />
        </label>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Ewidencja kart</span><small>{notice || `${rows.length} pozycji`}</small></div>
        <AssessmentTable
          assessments={rows}
          onPreview={setSelected}
          onPrint={printRow}
          onEdit={canMutate ? setEditing : undefined}
          onAdvance={canMutate ? (item) => void advance(item) : undefined}
        />
        <div className="row-action-strip">
          {canMutate ? rows.slice(0, 6).map((item) => (
            <button key={item.id} className="ghost-btn" type="button" onClick={() => advance(item)}>
              {item.spec}: {statusLabels[item.status]} →
            </button>
          )) : <span className="hint-text">Tryb tylko do odczytu: podglad i eksporty pozostaja dostepne.</span>}
        </div>
      </section>
      {selected ? <AssessmentPreviewModal assessment={selected} onClose={() => setSelected(null)} onPrint={printRow} /> : null}
      {editing ? <AssessmentEditModal assessment={editing} onClose={() => setEditing(null)} onSave={onUpdate} /> : null}
    </main>
  )
}

type AnalyticsFilters = {
  period: string
  type: AssessmentType | 'all'
  leader: string
  specialist: string
}

type DashboardPanelKey = 'trend' | 'typeMix' | 'sections' | 'leaders' | 'weak' | 'lowScores'
type DashboardDensity = 'comfortable' | 'compact'
type DashboardLayout = 'grid' | 'focus'
type DashboardPrefs = { order: DashboardPanelKey[]; hidden: DashboardPanelKey[]; density: DashboardDensity; layout: DashboardLayout }

const dashboardPanelLabels: Record<DashboardPanelKey, string> = {
  trend: 'Trend okresowy',
  typeMix: 'Rozklad typow',
  sections: 'Sekcje jakosci',
  leaders: 'Ranking liderow',
  weak: 'Slabe kryteria',
  lowScores: 'Najpilniejsze karty',
}

const defaultDashboardPanelOrder: DashboardPanelKey[] = ['trend', 'typeMix', 'sections', 'leaders', 'weak', 'lowScores']

function readDashboardPrefs(): DashboardPrefs {
  const fallback: DashboardPrefs = { order: defaultDashboardPanelOrder, hidden: [], density: 'comfortable', layout: 'grid' }
  try {
    const parsed = JSON.parse(localStorage.getItem('oc_v2_dashboard_prefs') || 'null') as Partial<DashboardPrefs> | null
    if (!parsed) return fallback
    const order = (parsed.order || fallback.order).filter((item): item is DashboardPanelKey => defaultDashboardPanelOrder.includes(item as DashboardPanelKey))
    return {
      order: [...order, ...defaultDashboardPanelOrder.filter((item) => !order.includes(item))],
      hidden: (parsed.hidden || []).filter((item): item is DashboardPanelKey => defaultDashboardPanelOrder.includes(item as DashboardPanelKey)),
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      layout: parsed.layout === 'focus' ? 'focus' : 'grid',
    }
  } catch {
    return fallback
  }
}

function writeDashboardPrefs(prefs: DashboardPrefs) {
  try {
    localStorage.setItem('oc_v2_dashboard_prefs', JSON.stringify(prefs))
  } catch {
    // UI preferences are optional.
  }
}

function defaultAnalyticsFilters(): AnalyticsFilters {
  return { period: 'all', type: 'all', leader: 'all', specialist: 'all' }
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pl'))
}

function applyAnalyticsFilters(rows: Assessment[], filters: AnalyticsFilters): Assessment[] {
  return rows.filter((item) => (
    item.status !== 'archived'
    && (filters.period === 'all' || item.period === filters.period)
    && (filters.type === 'all' || item.type === filters.type)
    && (filters.leader === 'all' || item.oce === filters.leader || item.leaderScope === filters.leader)
    && (filters.specialist === 'all' || item.spec === filters.specialist)
  ))
}

function AnalyticsFilterBar({
  assessments,
  filters,
  onChange,
}: {
  assessments: Assessment[]
  filters: AnalyticsFilters
  onChange: (filters: AnalyticsFilters) => void
}) {
  const periods = uniqueSorted(assessments.map((item) => item.period))
  const leaders = uniqueSorted(assessments.map((item) => item.oce || item.leaderScope))
  const specialists = uniqueSorted(assessments.map((item) => item.spec))

  return (
    <section className="analytics-filters">
      <label>
        <span>Okres</span>
        <select value={filters.period} onChange={(event) => onChange({ ...filters, period: event.target.value })}>
          <option value="all">Wszystkie</option>
          {periods.map((period) => <option key={period} value={period}>{period}</option>)}
        </select>
      </label>
      <label>
        <span>Typ</span>
        <select value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value as AssessmentType | 'all' })}>
          <option value="all">Wszystkie</option>
          {(Object.keys(TYPE_LABELS) as AssessmentType[]).map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
        </select>
      </label>
      <label>
        <span>Lider</span>
        <select value={filters.leader} onChange={(event) => onChange({ ...filters, leader: event.target.value })}>
          <option value="all">Wszyscy</option>
          {leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}
        </select>
      </label>
      <label>
        <span>Specjalista</span>
        <select value={filters.specialist} onChange={(event) => onChange({ ...filters, specialist: event.target.value })}>
          <option value="all">Wszyscy</option>
          {specialists.map((specialist) => <option key={specialist} value={specialist}>{specialist}</option>)}
        </select>
      </label>
      <button className="ghost-btn" type="button" onClick={() => onChange(defaultAnalyticsFilters())}>Reset</button>
    </section>
  )
}

function sectionAverage(assessment: Assessment, sectionKey: string): number {
  if (assessment.secAvg[sectionKey]) return assessment.secAvg[sectionKey]
  const section = ASSESSMENT_DEFS[assessment.type].sections.find((item) => item.key === sectionKey)
  if (!section) return 0
  const values = section.criteria.flatMap((_, criterionIndex) => (
    assessment.snapshotScores[sectionKey]?.[criterionIndex] || []
  )).filter((value) => value !== 'nd') as number[]
  return values.length ? Math.round(values.reduce((acc, value) => acc + value, 0) / values.length * 100) : 100
}

function sectionBreakdown(rows: Assessment[]) {
  const buckets = new Map<string, { label: string; sum: number; count: number }>()
  rows.forEach((assessment) => {
    ASSESSMENT_DEFS[assessment.type].sections.forEach((section) => {
      const key = `${assessment.type}-${section.key}`
      const current = buckets.get(key) || { label: `${TYPE_LABELS[assessment.type]} · ${section.label}`, sum: 0, count: 0 }
      current.sum += sectionAverage(assessment, section.key)
      current.count += 1
      buckets.set(key, current)
    })
  })
  return [...buckets.values()]
    .map((item) => ({ label: item.label, avg: item.count ? Math.round(item.sum / item.count) : 0, count: item.count }))
    .sort((a, b) => a.avg - b.avg)
}

function weakestCriteria(rows: Assessment[]) {
  const buckets = new Map<string, { label: string; sum: number; count: number }>()
  rows.forEach((assessment) => {
    const def = ASSESSMENT_DEFS[assessment.type]
    def.sections.forEach((section) => {
      section.criteria.forEach((criterion, criterionIndex) => {
        const values = (assessment.snapshotScores[section.key]?.[criterionIndex] || []).filter((value) => value !== 'nd') as number[]
        if (!values.length) return
        const key = `${assessment.type}-${section.key}-${criterionIndex}`
        const current = buckets.get(key) || { label: `${TYPE_LABELS[assessment.type]} · ${criterion.name}`, sum: 0, count: 0 }
        current.sum += values.reduce((acc, value) => acc + value, 0)
        current.count += values.length
        buckets.set(key, current)
      })
    })
  })
  return [...buckets.values()]
    .map((item) => ({ label: item.label, avg: item.count ? Math.round(item.sum / item.count * 100) : 0, count: item.count }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 10)
}

function periodRank(period: string): number {
  const match = period.match(/P(\d)\s+(\d{4})/)
  if (!match) return 0
  return Number(match[2]) * 10 + Number(match[1])
}

function dashboardTrend(rows: Assessment[]) {
  const buckets = new Map<string, { period: string; count: number; sum: number; below: number; review: number }>()
  rows.forEach((assessment) => {
    const period = assessment.period || 'Brak okresu'
    const current = buckets.get(period) || { period, count: 0, sum: 0, below: 0, review: 0 }
    current.count += 1
    current.sum += assessment.avgFinal
    if (assessment.rating === 'below') current.below += 1
    if (assessment.status === 'review' || assessment.status === 'submitted') current.review += 1
    buckets.set(period, current)
  })
  return [...buckets.values()]
    .map((item) => ({ ...item, avg: item.count ? Math.round(item.sum / item.count) : 0 }))
    .sort((a, b) => periodRank(a.period) - periodRank(b.period) || a.period.localeCompare(b.period, 'pl'))
}

function dashboardLeaderRanking(rows: Assessment[]) {
  const buckets = new Map<string, Assessment[]>()
  rows.forEach((assessment) => {
    const leader = assessment.leaderScope || assessment.oce || 'Brak lidera'
    buckets.set(leader, [...(buckets.get(leader) || []), assessment])
  })
  return [...buckets.entries()]
    .map(([leader, leaderRows]) => ({
      leader,
      count: leaderRows.length,
      avg: leaderRows.length ? Math.round(leaderRows.reduce((acc, item) => acc + item.avgFinal, 0) / leaderRows.length) : 0,
      below: leaderRows.filter((item) => item.rating === 'below').length,
      review: leaderRows.filter((item) => item.status === 'review' || item.status === 'submitted').length,
    }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, 8)
}

function DashboardView({ assessments, goals }: { assessments: Assessment[]; goals: AdminConfig['goals'] }) {
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
        <AssessmentTable assessments={[...active].sort((a, b) => a.avgFinal - b.avgFinal).slice(0, 8)} compact />
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

function exportLeaderSummary(rows: Array<{ leader: string; count: number; avg: number; great: number; below: number }>) {
  const header = ['Lider', 'Karty', 'Srednia', 'Bardzo dobry', 'Ponizej standardu']
  const body = rows.map((item) => [item.leader, item.count, `${item.avg}%`, item.great, item.below])
  const csv = `\uFEFF${[header, ...body].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
  downloadFile('oceniator-raport-liderow.csv', 'text/csv;charset=utf-8', csv)
}

function ReportsView({ assessments }: { assessments: Assessment[] }) {
  const [filters, setFilters] = useState<AnalyticsFilters>(() => defaultAnalyticsFilters())
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

  return (
    <main className="screen">
      <AnalyticsFilterBar assessments={assessments} filters={filters} onChange={setFilters} />
      <section className="data-panel">
        <div className="section-title">
          <span>Raport liderow</span>
          <small>{filtered.length} kart w filtrze</small>
        </div>
        <div className="report-actions">
          <button className="ghost-btn" type="button" onClick={() => exportLeaderSummary(byLeader)}><Download size={16} /> Eksport CSV</button>
          <button className="ghost-btn" type="button" onClick={() => exportJson(filtered)}><Download size={16} /> Karty JSON</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Lider</th><th>Karty</th><th>Srednia</th><th>Bardzo dobry</th><th>Ponizej standardu</th></tr></thead>
            <tbody>
              {byLeader.map((item) => (
                <tr key={item.leader}>
                  <td><strong>{item.leader}</strong></td>
                  <td>{item.count}</td>
                  <td><span className={scoreClass(item.avg)}>{item.avg}%</span></td>
                  <td>{item.great}</td>
                  <td>{item.below}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Specjalisci do uwagi</span><small>najslabsze srednie w filtrze</small></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Specjalista</th><th>Lider</th><th>Karty</th><th>Srednia</th><th>Ostatnia karta</th></tr></thead>
            <tbody>
              {bySpecialist.map((item) => (
                <tr key={item.specialist}>
                  <td><strong>{item.specialist}</strong></td>
                  <td>{item.leader}</td>
                  <td>{item.count}</td>
                  <td><span className={scoreClass(item.avg)}>{item.avg}%</span></td>
                  <td>{item.lastDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function emptySpecialist(admin: AdminConfig): Specialist {
  return {
    id: crypto.randomUUID(),
    name: '',
    leader: admin.leaders[0] || '',
    department: admin.departments[0] || '',
    position: admin.positions[0] || '',
    active: true,
  }
}

function normalizeDictionary(values: string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pl'))
}

function AdminView({
  user,
  admin,
  users,
  onAdminChange,
  onUserSave,
  onUserCreate,
}: {
  user: UserProfile
  admin: AdminConfig
  users: ManagedUser[]
  onAdminChange: (admin: AdminConfig) => Promise<void>
  onUserSave: (user: ManagedUser) => Promise<void>
  onUserCreate: (user: ManagedUser) => Promise<ManagedUser>
}) {
  const [draftAdmin, setDraftAdmin] = useState(admin)
  const [selectedSpecialistId, setSelectedSpecialistId] = useState(admin.specialists[0]?.id || '')
  const [draftUsers, setDraftUsers] = useState(users)
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '')
  const [newUser, setNewUser] = useState<ManagedUser>({
    id: '',
    email: '',
    login: '',
    fullName: '',
    role: 'viewer',
    leaderScope: '',
    isActive: true,
    source: user.source,
    password: '',
  })
  const [newLeader, setNewLeader] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [newPosition, setNewPosition] = useState('')
  const [notice, setNotice] = useState('')

  const selectedSpecialist = draftAdmin.specialists.find((item) => item.id === selectedSpecialistId) || draftAdmin.specialists[0] || emptySpecialist(draftAdmin)
  const selectedUser = draftUsers.find((item) => item.id === selectedUserId) || draftUsers[0]

  if (!canAdmin(user)) {
    return (
      <main className="screen">
        <div className="empty-state">Brak dostepu do panelu admina dla tej roli.</div>
      </main>
    )
  }

  async function saveGoals() {
    const next = {
      ...draftAdmin,
      leaders: normalizeDictionary(draftAdmin.leaders),
      departments: normalizeDictionary(draftAdmin.departments),
      positions: normalizeDictionary(draftAdmin.positions),
      specialists: draftAdmin.specialists
        .filter((item) => item.name.trim())
        .map((item) => ({ ...item, name: item.name.trim() }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    }
    try {
      await onAdminChange(next)
      setDraftAdmin(next)
      setNotice(`Zapisano konfiguracje ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udalo sie zapisac konfiguracji.'))
    }
  }

  async function saveSelectedUser() {
    if (!selectedUser) return
    try {
      await onUserSave(selectedUser)
      setNotice(`Zapisano uzytkownika ${selectedUser.email || selectedUser.login}`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udalo sie zapisac uzytkownika.'))
    }
  }

  async function createNewUser() {
    if (!newUser.email && !newUser.login) return
    const created = {
      ...newUser,
      id: newUser.id || newUser.login || newUser.email,
      email: newUser.email || `${newUser.login}@local`,
      fullName: newUser.fullName || newUser.email || newUser.login || 'Nowy uzytkownik',
      password: newUser.password || 'start123',
      source: user.source,
    }
    try {
      const saved = await onUserCreate(created)
      setDraftUsers([saved, ...draftUsers])
      setSelectedUserId(saved.id)
      setNewUser({ ...newUser, id: '', email: '', login: '', fullName: '', password: '', role: 'viewer', leaderScope: '', isActive: true })
      setNotice(`Dodano uzytkownika ${saved.email || saved.login}`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udalo sie utworzyc uzytkownika.'))
    }
  }

  function updateUserDraft(id: string, patch: Partial<ManagedUser>) {
    setDraftUsers(draftUsers.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function updateGoals(field: keyof AdminConfig['goals'], value: number) {
    setDraftAdmin({ ...draftAdmin, goals: { ...draftAdmin.goals, [field]: value } })
  }

  function addDictionary(kind: 'leaders' | 'departments' | 'positions', value: string, clear: () => void) {
    const name = value.trim()
    if (!name) return
    setDraftAdmin({ ...draftAdmin, [kind]: normalizeDictionary([...draftAdmin[kind], name]) })
    clear()
  }

  function removeDictionary(kind: 'leaders' | 'departments' | 'positions', value: string) {
    setDraftAdmin({
      ...draftAdmin,
      [kind]: draftAdmin[kind].filter((item) => item !== value),
    })
  }

  function updateSpecialist(id: string, patch: Partial<Specialist>) {
    setDraftAdmin({
      ...draftAdmin,
      specialists: draftAdmin.specialists.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  function addSpecialist() {
    const specialist = emptySpecialist(draftAdmin)
    setDraftAdmin({ ...draftAdmin, specialists: [specialist, ...draftAdmin.specialists] })
    setSelectedSpecialistId(specialist.id)
  }

  function removeSpecialist(id: string) {
    const next = draftAdmin.specialists.filter((item) => item.id !== id)
    setDraftAdmin({ ...draftAdmin, specialists: next })
    setSelectedSpecialistId(next[0]?.id || '')
  }

  function updatePeriod(index: number, patch: Partial<AssessmentPeriod>) {
    setDraftAdmin({
      ...draftAdmin,
      periods: draftAdmin.periods.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    })
  }

  function addPeriod() {
    const number = draftAdmin.periods.length + 1
    setDraftAdmin({
      ...draftAdmin,
      periods: [...draftAdmin.periods, { code: `P${number}`, name: `P${number}`, from: '01-01', to: '12-31' }],
    })
  }

  function removePeriod(index: number) {
    setDraftAdmin({ ...draftAdmin, periods: draftAdmin.periods.filter((_, itemIndex) => itemIndex !== index) })
  }

  return (
    <main className="screen admin-screen">
      <section className="admin-hero data-panel">
        <div>
          <div className="section-title"><span>Panel admina</span><small>{notice || 'Konfiguracja slownikow i celow'}</small></div>
          <p className="hint-text">Zmiany w tym widoku zasilaja formularz oceny, zakres liderow oraz raporty. Zapis jest jawny, zeby uniknac przypadkowych zmian slownikow.</p>
        </div>
        <button className="primary-btn" onClick={saveGoals} type="button"><Save size={16} /> Zapisz konfiguracje</button>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Cele jakosciowe</span><small>progi i wolumeny</small></div>
        <div className="field-grid two">
          <label><span>Minimum sredniej</span><input type="number" value={draftAdmin.goals.minAvg} onChange={(event) => updateGoals('minAvg', Number(event.target.value))} /></label>
          <label><span>Udzial bardzo dobrych</span><input type="number" value={draftAdmin.goals.greatShare} onChange={(event) => updateGoals('greatShare', Number(event.target.value))} /></label>
          <label><span>Rozmowy / okres</span><input type="number" value={draftAdmin.goals.callsPerPeriod} onChange={(event) => updateGoals('callsPerPeriod', Number(event.target.value))} /></label>
          <label><span>Maile / okres</span><input type="number" value={draftAdmin.goals.mailsPerPeriod} onChange={(event) => updateGoals('mailsPerPeriod', Number(event.target.value))} /></label>
          <label><span>Systemy / okres</span><input type="number" value={draftAdmin.goals.systemsPerPeriod} onChange={(event) => updateGoals('systemsPerPeriod', Number(event.target.value))} /></label>
        </div>
      </section>
      <section className="data-panel dictionary-panel">
        <div className="section-title"><span>Slowniki</span><small>liderzy, dzialy, stanowiska</small></div>
        <div className="dictionary-columns">
          <DictionaryEditor
            title="Liderzy"
            values={draftAdmin.leaders}
            value={newLeader}
            onValue={setNewLeader}
            onAdd={() => addDictionary('leaders', newLeader, () => setNewLeader(''))}
            onRemove={(value) => removeDictionary('leaders', value)}
          />
          <DictionaryEditor
            title="Dzialy"
            values={draftAdmin.departments}
            value={newDepartment}
            onValue={setNewDepartment}
            onAdd={() => addDictionary('departments', newDepartment, () => setNewDepartment(''))}
            onRemove={(value) => removeDictionary('departments', value)}
          />
          <DictionaryEditor
            title="Stanowiska"
            values={draftAdmin.positions}
            value={newPosition}
            onValue={setNewPosition}
            onAdd={() => addDictionary('positions', newPosition, () => setNewPosition(''))}
            onRemove={(value) => removeDictionary('positions', value)}
          />
        </div>
      </section>
      <section className="data-panel specialist-admin">
        <div className="section-title">
          <span>Specjalisci</span>
          <small>{draftAdmin.specialists.filter((item) => item.active).length} aktywnych / {draftAdmin.specialists.length} lacznie</small>
        </div>
        <div className="specialist-layout">
          <div className="specialist-list">
            <button className="ghost-btn wide" type="button" onClick={addSpecialist}><Plus size={16} /> Dodaj specjaliste</button>
            {draftAdmin.specialists.map((specialist) => (
              <button
                key={specialist.id}
                className={specialist.id === selectedSpecialist.id ? 'active' : ''}
                type="button"
                onClick={() => setSelectedSpecialistId(specialist.id)}
              >
                <strong>{specialist.name || 'Nowy specjalista'}</strong>
                <small>{specialist.leader || 'Bez lidera'} · {specialist.active ? 'aktywny' : 'nieaktywny'}</small>
              </button>
            ))}
          </div>
          <div className="specialist-editor">
            <div className="field-grid two">
              <label><span>Imie i nazwisko</span><input value={selectedSpecialist.name} onChange={(event) => updateSpecialist(selectedSpecialist.id, { name: event.target.value })} /></label>
              <label><span>Lider</span><select value={selectedSpecialist.leader} onChange={(event) => updateSpecialist(selectedSpecialist.id, { leader: event.target.value })}>{draftAdmin.leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}</select></label>
              <label><span>Dzial</span><select value={selectedSpecialist.department} onChange={(event) => updateSpecialist(selectedSpecialist.id, { department: event.target.value })}>{draftAdmin.departments.map((department) => <option key={department} value={department}>{department}</option>)}</select></label>
              <label><span>Stanowisko</span><select value={selectedSpecialist.position} onChange={(event) => updateSpecialist(selectedSpecialist.id, { position: event.target.value })}>{draftAdmin.positions.map((position) => <option key={position} value={position}>{position}</option>)}</select></label>
            </div>
            <div className="admin-inline-actions">
              <label className="toggle-line"><input type="checkbox" checked={selectedSpecialist.active} onChange={(event) => updateSpecialist(selectedSpecialist.id, { active: event.target.checked })} /> Aktywny specjalista</label>
              <button className="ghost-btn" type="button" onClick={() => removeSpecialist(selectedSpecialist.id)}><Trash2 size={16} /> Usun z listy</button>
            </div>
          </div>
        </div>
      </section>
      <section className="data-panel user-admin">
        <div className="section-title"><span>Uzytkownicy i role</span><small>{draftUsers.length} kont</small></div>
        <div className="user-layout">
          <div className="user-list">
            {draftUsers.map((account) => (
              <button
                key={account.id}
                className={account.id === selectedUser?.id ? 'active' : ''}
                type="button"
                onClick={() => setSelectedUserId(account.id)}
              >
                <strong>{account.fullName || account.email || account.login}</strong>
                <small>{roleLabels[account.role]} · {account.isActive ? 'aktywny' : 'nieaktywny'}</small>
              </button>
            ))}
          </div>
          <div className="user-editor">
            {selectedUser ? (
              <>
                <div className="field-grid two">
                  <label><span>Email</span><input value={selectedUser.email} onChange={(event) => updateUserDraft(selectedUser.id, { email: event.target.value })} /></label>
                  <label><span>Login lokalny</span><input value={selectedUser.login || ''} onChange={(event) => updateUserDraft(selectedUser.id, { login: event.target.value })} /></label>
                  <label><span>Imie i nazwisko</span><input value={selectedUser.fullName} onChange={(event) => updateUserDraft(selectedUser.id, { fullName: event.target.value })} /></label>
                  <label><span>Rola</span><select value={selectedUser.role} onChange={(event) => updateUserDraft(selectedUser.id, { role: event.target.value as UserProfile['role'] })}>{Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
                  <label><span>Zakres lidera</span><select value={selectedUser.leaderScope} onChange={(event) => updateUserDraft(selectedUser.id, { leaderScope: event.target.value })}><option value="">Brak / pelny zakres</option>{draftAdmin.leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}</select></label>
                  <label><span>Haslo lokalne / startowe</span><input type="password" value={selectedUser.password || ''} onChange={(event) => updateUserDraft(selectedUser.id, { password: event.target.value })} /></label>
                </div>
                <div className="admin-inline-actions">
                  <label className="toggle-line"><input type="checkbox" checked={selectedUser.isActive} onChange={(event) => updateUserDraft(selectedUser.id, { isActive: event.target.checked })} /> Konto aktywne</label>
                  <button className="primary-btn" type="button" onClick={saveSelectedUser}><Save size={16} /> Zapisz uzytkownika</button>
                </div>
              </>
            ) : <div className="empty-state">Brak uzytkownikow.</div>}
          </div>
        </div>
        <div className="new-user-panel">
          <div className="section-title"><span>Nowe konto</span><small>{user.source === 'supabase' ? 'tworzone przez Edge Function' : 'konto lokalne demo'}</small></div>
          <div className="field-grid">
            <label><span>Email</span><input value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
            <label><span>Login lokalny</span><input value={newUser.login || ''} onChange={(event) => setNewUser({ ...newUser, login: event.target.value })} /></label>
            <label><span>Imie i nazwisko</span><input value={newUser.fullName} onChange={(event) => setNewUser({ ...newUser, fullName: event.target.value })} /></label>
            <label><span>Haslo startowe</span><input type="password" value={newUser.password || ''} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /></label>
            <label><span>Rola</span><select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as UserProfile['role'] })}>{Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
            <label><span>Zakres lidera</span><select value={newUser.leaderScope} onChange={(event) => setNewUser({ ...newUser, leaderScope: event.target.value })}><option value="">Brak / pelny zakres</option>{draftAdmin.leaders.map((leader) => <option key={leader} value={leader}>{leader}</option>)}</select></label>
          </div>
          <button className="ghost-btn" type="button" onClick={createNewUser}><Plus size={16} /> Utworz konto</button>
        </div>
      </section>
      <section className="data-panel periods-panel">
        <div className="section-title"><span>Okresy rozliczeniowe</span><small>{draftAdmin.periods.length} okresy</small></div>
        <div className="period-grid">
          {draftAdmin.periods.map((period, index) => (
            <div className="period-row" key={`${period.code}-${index}`}>
              <input value={period.code} onChange={(event) => updatePeriod(index, { code: event.target.value })} />
              <input value={period.name} onChange={(event) => updatePeriod(index, { name: event.target.value })} />
              <input value={period.from} onChange={(event) => updatePeriod(index, { from: event.target.value })} />
              <input value={period.to} onChange={(event) => updatePeriod(index, { to: event.target.value })} />
              <button type="button" onClick={() => removePeriod(index)}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <button className="ghost-btn" type="button" onClick={addPeriod}><Plus size={16} /> Dodaj okres</button>
      </section>
    </main>
  )
}

function DictionaryEditor({
  title,
  values,
  value,
  onValue,
  onAdd,
  onRemove,
}: {
  title: string
  values: string[]
  value: string
  onValue: (value: string) => void
  onAdd: () => void
  onRemove: (value: string) => void
}) {
  return (
    <div className="dictionary-editor">
      <h3>{title}</h3>
      <div className="dictionary-add">
        <input value={value} onChange={(event) => onValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onAdd() }} placeholder="Nowa wartosc" />
        <button type="button" onClick={onAdd}><Plus size={15} /></button>
      </div>
      <div className="dictionary-list">
        {values.map((item) => (
          <span key={item}><Users size={14} /> {item}<button type="button" onClick={() => onRemove(item)}><X size={12} /></button></span>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [provider, setProvider] = useState<DataProvider>(() => createProvider())
  const [user, setUser] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [admin, setAdmin] = useState<AdminConfig | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [drafts, setDrafts] = useState<Record<AssessmentType, AssessmentDraft | undefined>>({ r: undefined, m: undefined, s: undefined })
  const [view, setView] = useState<ViewKey>('start')
  const [activeType, setActiveType] = useState<AssessmentType>('r')
  const [bootError, setBootError] = useState('')

  const loadWorkspace = useCallback(async (currentUser: UserProfile, activeProvider = provider) => {
    setBootError('')
    const [adminResult, assessmentsResult, draftsResult, usersResult] = await Promise.allSettled([
      activeProvider.loadAdmin(),
      activeProvider.loadAssessments(),
      activeProvider.loadDrafts(),
      activeProvider.listUsers ? activeProvider.listUsers() : Promise.resolve([]),
    ])
    const failures = [adminResult, assessmentsResult, draftsResult, usersResult]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => readableError(result.reason, 'Blad pobierania danych.'))
    const nextAdmin = adminResult.status === 'fulfilled' ? adminResult.value : buildDemoAdmin()
    const nextAssessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : []
    const nextDrafts = draftsResult.status === 'fulfilled' ? draftsResult.value : { r: undefined, m: undefined, s: undefined }
    const nextUsers = usersResult.status === 'fulfilled' ? usersResult.value : []
    setUser(currentUser)
    setUsers(nextUsers)
    setAdmin(nextAdmin)
    setAssessments(scopedAssessments(nextAssessments, currentUser))
    setDrafts(nextDrafts)
    if (failures.length) setBootError(`Czesc danych jest chwilowo niedostepna: ${failures.join(' ')}`)
  }, [provider])

  useEffect(() => {
    provider.getCurrentUser()
      .then((currentUser) => {
        if (currentUser) return loadWorkspace(currentUser)
        return undefined
      })
      .catch((error) => setBootError(error instanceof Error ? error.message : 'Blad startu aplikacji.'))
  }, [provider, loadWorkspace])

  async function login(loginValue: string, password: string) {
    const currentUser = await provider.signIn(loginValue, password)
    if (provider.mode === 'supabase') localStorage.removeItem('oc_v2_provider')
    await loadWorkspace(currentUser)
  }

  async function localDemo() {
    localStorage.setItem('oc_v2_provider', 'local')
    const local = createProvider(true)
    setProvider(local)
    const currentUser = await local.signIn('admin', 'admin123')
    await loadWorkspace(currentUser, local)
  }

  async function logout() {
    await provider.signOut()
    setUser(null)
    setUsers([])
    setAdmin(null)
    setAssessments([])
    setView('start')
  }

  async function updateDraft(draft: AssessmentDraft) {
    setActiveType(draft.type)
    const next = { ...drafts, [draft.type]: draft }
    setDrafts(next)
    await provider.saveDrafts(next)
  }

  async function saveAssessment(draft: AssessmentDraft) {
    if (!user) return
    const assessment = draftToAssessment(draft, user.leaderScope || draft.assessor)
    await provider.saveAssessment(assessment)
    const nextDrafts = { ...drafts, [draft.type]: createDraft(draft.type) }
    setDrafts(nextDrafts)
    await provider.saveDrafts(nextDrafts)
    const all = await provider.loadAssessments()
    setAssessments(scopedAssessments(all, user))
    setView('registry')
  }

  async function updateAssessment(assessment: Assessment) {
    if (!user) return
    await provider.updateAssessment(assessment)
    const all = await provider.loadAssessments()
    setAssessments(scopedAssessments(all, user))
  }

  async function bulkImportAssessments(imported: Assessment[]) {
    if (!user) return
    const existing = await provider.loadAssessments()
    const merged = [
      ...imported,
      ...existing.filter((item) => !imported.some((next) => next.id === item.id)),
    ]
    if (provider.saveAssessments) {
      await provider.saveAssessments(merged)
    } else {
      await Promise.all(imported.map((item) => provider.saveAssessment(item)))
    }
    const all = await provider.loadAssessments()
    setAssessments(scopedAssessments(all, user))
  }

  async function updateAdmin(nextAdmin: AdminConfig) {
    await provider.saveAdmin(nextAdmin)
    setAdmin(nextAdmin)
  }

  async function saveManagedUser(nextUser: ManagedUser) {
    if (!provider.updateUser) return
    const saved = await provider.updateUser(nextUser)
    const nextUsers = users.map((item) => (item.id === saved.id ? saved : item))
    setUsers(nextUsers)
    if (user?.id === saved.id) setUser(saved)
  }

  async function createManagedUser(nextUser: ManagedUser): Promise<ManagedUser> {
    if (!provider.createUser) throw new Error('Provider nie obsluguje tworzenia uzytkownikow.')
    const created = await provider.createUser(nextUser)
    setUsers([created, ...users])
    return created
  }

  if (!user || !admin) {
    return (
      <>
        <LoginScreen provider={provider} onLogin={login} onLocalDemo={localDemo} />
        {bootError ? <div className="floating-error">{bootError}</div> : null}
      </>
    )
  }

  const activeDraft = drafts[activeType] || createDraft(activeType)
  const effectiveView = availableNavItems(user).some((item) => item.key === view) ? view : 'start'

  return (
    <AppShell user={user} providerMode={provider.mode} view={effectiveView} setView={setView} onLogout={logout} systemNotice={bootError}>
      {effectiveView === 'start' ? <StartView user={user} assessments={assessments} setView={setView} /> : null}
      {effectiveView === 'form' && canCreate(user) ? (
        <EvaluationView
          user={user}
          admin={admin}
          draft={activeDraft}
          onDraftChange={updateDraft}
          onSaveAssessment={saveAssessment}
        />
      ) : null}
      {effectiveView === 'team' ? <TeamView user={user} admin={admin} assessments={assessments} setView={setView} /> : null}
      {effectiveView === 'registry' ? <RegistryView assessments={assessments} user={user} onUpdate={updateAssessment} onBulkImport={bulkImportAssessments} /> : null}
      {effectiveView === 'dashboard' ? <DashboardView assessments={assessments} goals={admin.goals} /> : null}
      {effectiveView === 'reports' ? <ReportsView assessments={assessments} /> : null}
      {effectiveView === 'admin' && canAdmin(user) ? (
        <AdminView
          user={user}
          admin={admin}
          users={users}
          onAdminChange={updateAdmin}
          onUserSave={saveManagedUser}
          onUserCreate={createManagedUser}
        />
      ) : null}
    </AppShell>
  )
}

export default App

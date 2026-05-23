import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, ClipboardCheck, Database, Eye, FileBarChart, FileText, LayoutDashboard, LogOut, Mail, MonitorCog, Moon, PanelRight, PhoneCall, Plus, RotateCcw, Settings, ShieldCheck, Sun, Trash2, UserRound, Users } from 'lucide-react'
import { TYPE_LABELS } from './domain/defs'
import { createDraft, draftHasContent, draftToAssessment } from './domain/scoring'
import { buildDemoAdmin } from './data/seed'
import { createProvider } from './data/supabaseProvider'
import EvaluationView from './features/evaluation/EvaluationView'
import { AssessmentTable } from './features/registry/AssessmentTable'
import RegistryView from './features/registry/RegistryView'
import { SpecialistProfileModal } from './features/specialists/profile'
import type {
  AdminConfig,
  Assessment,
  AssessmentDraft,
  AssessmentType,
  DataProvider,
  ManagedUser,
  UserProfile,
} from './domain/types'
import { useTheme } from './lib/theme'
import './index.css'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

const navItems: Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'start', label: 'G\u0142\u00F3wna', icon: LayoutDashboard },
  { key: 'form', label: 'Ocena rozm\u00F3w', icon: PhoneCall },
  { key: 'team', label: 'M\u00F3j zesp\u00F3\u0142', icon: Users },
  { key: 'registry', label: 'Ewidencja', icon: ClipboardCheck },
  { key: 'dashboard', label: 'Analityka', icon: BarChart3 },
  { key: 'reports', label: 'Raporty', icon: FileBarChart },
  { key: 'admin', label: 'Administracja', icon: Settings },
]

const localDemoAccounts = 'admin/admin123, lider01/lider123, lider02/lider123, lider/lider123, oceniajacy/ocena123, podglad/podglad123'

const ReportsView = lazy(() => import('./features/reports/ReportsView'))
const AdminView = lazy(() => import('./features/admin/AdminView'))
const DashboardView = lazy(() => import('./features/dashboard/DashboardView'))
const lazyViewFallback = (
  <main className="screen">
    <div className="empty-state">{'\u0141adowanie widoku...'}</div>
  </main>
)

const lazyViewLoaders: Partial<Record<ViewKey, () => Promise<unknown>>> = {
  dashboard: () => import('./features/dashboard/DashboardView'),
  reports: () => import('./features/reports/ReportsView'),
  admin: () => import('./features/admin/AdminView'),
}

function preloadView(view: ViewKey) {
  void lazyViewLoaders[view]?.()
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

function readableError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
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
  const { theme, toggleTheme } = useTheme()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(login, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie uda\u0142o si\u0119 zalogowa\u0107.')
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
      setError(readableError(err, 'Nie uda\u0142o si\u0119 uruchomi\u0107 lokalnego demo.'))
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
            <small>{'Platforma oceny jako\u015Bci'}</small>
          </div>
        </div>
        <div className="login-copy">
          <span className="login-kicker">{'System operacyjny dla jako\u015Bci'}</span>
          <h1>{'Ocena jako\u015Bci, ewidencja i decyzje lider\u00F3w w jednym uporz\u0105dkowanym miejscu.'}</h1>
          <p>
            {'Ten ekran ma prowadzi\u0107 do pracy w produkcie, nie wygl\u0105da\u0107 jak tani szablon. '}
            {'Dostajesz szybkie wej\u015Bcie do aplikacji, tryb demo i czytelny kontekst operacyjny.'}
          </p>
        </div>
        <div className="login-metrics">
          <article>
            <strong>3 obszary</strong>
            <span>ocena, ewidencja, raportowanie</span>
          </article>
          <article>
            <strong>Role i zakresy</strong>
            <span>{'admin, dyrektor, lider, oceniaj\u0105cy, podgl\u0105d'}</span>
          </article>
          <article>
            <strong>Tryb danych</strong>
            <span>Supabase albo lokalne demo</span>
          </article>
        </div>
        <div className="login-preview">
          <section className="login-preview-card">
            <header>
              <span>{'Przep\u0142yw pracy'}</span>
              <strong>Od oceny do decyzji</strong>
            </header>
            <ol>
              <li>{'Uzupe\u0142nij kart\u0119 i zapisz szkic lokalnie.'}</li>
              <li>{'Przejd\u017A do ewidencji i domknij status.'}</li>
              <li>{'Sprawd\u017A raporty, trendy i priorytety coachingowe.'}</li>
            </ol>
          </section>
          <section className="login-preview-card compact">
            <header>
              <span>Widok operacyjny</span>
              <strong>Gotowy do codziennej pracy</strong>
            </header>
            <div className="login-proof">
              <div><ShieldCheck size={18} /> {'Historia zmian i status\u00F3w'}</div>
              <div><Database size={18} /> Dane lokalne lub Supabase</div>
              <div><PanelRight size={18} /> Eksporty, raporty i PDF</div>
            </div>
          </section>
        </div>
      </section>
      <section className="login-card">
        <div className="section-title login-card-head">
          <div>
            <span>{provider.mode === 'supabase' ? 'Logowanie Supabase' : 'Logowanie lokalne'}</span>
            <p className="login-card-copy">
              {'Wejd\u017A do aplikacji i kontynuuj prac\u0119 bez ekran\u00F3w przej\u015Bciowych.'}
            </p>
          </div>
          <button className="theme-toggle" type="button" onClick={toggleTheme} title={'Prze\u0142\u0105cz motyw'}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === 'dark' ? 'Jasny' : 'Ciemny'}</span>
          </button>
        </div>
        <form onSubmit={submit} className="stack">
          <label>
            <span>{provider.mode === 'supabase' ? 'Adres e-mail' : 'Login lokalny'}</span>
            <input value={login} onChange={(event) => setLogin(event.target.value)} autoFocus />
          </label>
          <label>
            <span>{'Has\u0142o'}</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <div className="error-box">{error}</div> : null}
          <button className="primary-btn" disabled={busy} type="submit">
            {busy ? 'Logowanie...' : 'Zaloguj si\u0119'}
          </button>
        </form>
        <button className="ghost-btn wide" type="button" disabled={busy} onClick={() => void startLocalDemo()}>
          Uruchom demo lokalne jako administrator
        </button>
        <p className="hint-text">Konta testowe: {localDemoAccounts}.</p>
      </section>
    </main>
  )
}

function AppShell({
  user,
  providerMode,
  view,
  setView,
  onViewIntent,
  children,
  onLogout,
  systemNotice,
}: {
  user: UserProfile
  providerMode: DataProvider['mode']
  view: ViewKey
  setView: (view: ViewKey) => void
  onViewIntent?: (view: ViewKey) => void
  children: React.ReactNode
  onLogout: () => void
  systemNotice?: string
}) {
  const visibleNavItems = availableNavItems(user)
  const activeTitle = visibleNavItems.find((item) => item.key === view)?.label || 'Oceniator'
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="logo-box" />
          <div>
            <strong>Oceniator</strong>
            <small>{'System jako\u015Bci'}</small>
          </div>
        </div>
        <nav className="side-nav">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                className={view === item.key ? 'active' : ''}
                onClick={() => setView(item.key)}
                onMouseEnter={() => onViewIntent?.(item.key)}
                onFocus={() => onViewIntent?.(item.key)}
                type="button"
              >
                <Icon size={17} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="theme-toggle theme-toggle-wide" type="button" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}</span>
          </button>
          <div className="mode-chip"><Database size={14} /> {providerMode === 'supabase' ? 'Supabase' : 'Demo lokalne'}</div>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            <h2>{activeTitle}</h2>
            <p>{user.fullName} • {user.role}</p>
          </div>
          <div className="user-pill">
            <UserRound size={15} />
            <span>{user.email}</span>
            <button className="topbar-theme" type="button" onClick={toggleTheme} title={'Prze\u0142\u0105cz motyw'}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button type="button" onClick={onLogout}><LogOut size={15} /> Wyloguj</button>
          </div>
        </header>
        {systemNotice ? <div className="system-notice">{systemNotice}</div> : null}
        {children}
      </section>
      <div className="desktop-guard">
        <MonitorCog size={44} />
        <h1>{'Aplikacja wymaga wi\u0119kszego ekranu'}</h1>
        <p>{'Oceniator jest projektowany pod desktop. U\u017Cyj szeroko\u015Bci minimum 1280 px.'}</p>
      </div>
    </div>
  )
}

function StartView({
  user,
  assessments,
  drafts,
  setView,
  onResumeDraft,
  onClearDraft,
}: {
  user: UserProfile
  assessments: Assessment[]
  drafts: Record<AssessmentType, AssessmentDraft | undefined>
  setView: (view: ViewKey) => void
  onResumeDraft: (type: AssessmentType) => void
  onClearDraft: (type: AssessmentType) => void
}) {
  const active = assessments.filter((item) => item.status !== 'archived')
  const avg = active.length ? Math.round(active.reduce((acc, item) => acc + item.avgFinal, 0) / active.length) : 0
  const review = active.filter((item) => item.status === 'review').length
  const savedDrafts = (Object.entries(drafts) as Array<[AssessmentType, AssessmentDraft | undefined]>)
    .filter((entry): entry is [AssessmentType, AssessmentDraft] => Boolean(entry[1] && draftHasContent(entry[1])))
    .sort(([, left], [, right]) => (right.savedAt || '').localeCompare(left.savedAt || ''))

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
          {savedDrafts[0] ? (
            <div className="hero-inline-note">
              <span>Ostatni szkic: {TYPE_LABELS[savedDrafts[0][0]]}</span>
              <strong>{savedDrafts[0][1].specialist || 'bez wybranego specjalisty'}</strong>
              <button className="ghost-btn" type="button" onClick={() => onResumeDraft(savedDrafts[0][0])}>
                Wznow szkic
              </button>
            </div>
          ) : null}
        </div>
        <div className="metric-panel"><span>Karty aktywne</span><strong>{active.length}</strong><small>dla zakresu: {user.role}</small></div>
        <div className="metric-panel"><span>Sredni wynik</span><strong>{avg || '-'}%</strong><small>cel minimum 92%</small></div>
        <div className="metric-panel"><span>W weryfikacji</span><strong>{review}</strong><small>wymagają decyzji</small></div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Szkice robocze</span><small>{savedDrafts.length ? `${savedDrafts.length} zapisane` : 'brak aktywnych szkicow'}</small></div>
        {savedDrafts.length ? (
          <div className="draft-grid">
            {savedDrafts.map(([type, draft]) => (
              <article className="draft-card" key={type}>
                <div className="draft-card-top">
                  <span className="type-badge">{typeIcon(type)} {TYPE_LABELS[type]}</span>
                  <small>{draft.savedAt ? new Date(draft.savedAt).toLocaleString('pl-PL') : 'Zapis lokalny'}</small>
                </div>
                <strong>{draft.specialist || 'Szkic bez wybranego specjalisty'}</strong>
                <p>{draft.summary || `${draft.contactCount} kontakt(y), okres ${draft.period || '-'}`}</p>
                <div className="draft-card-meta">
                  <span>{draft.position || 'Brak stanowiska'}</span>
                  <span>{draft.department || 'Brak dzialu'}</span>
                </div>
                <div className="draft-card-actions">
                  <button className="primary-btn" type="button" onClick={() => onResumeDraft(type)}>
                    <RotateCcw size={15} /> Wznow szkic
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => onClearDraft(type)}>
                    <Trash2 size={15} /> Wyczyść
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-state">Brak zapisanych szkiców. Formularz zapisuje postęp lokalnie przy każdej zmianie.</div>}
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
          <p className="hint-text">Widok operacyjny lidera pokazuje aktywnych specjalistów, ostatnie karty i priorytety do rozmow 1:1.</p>
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
        <div className="metric-panel"><span>Sredni wynik</span><strong>{avg || '-'}%</strong><small>dla zespolu</small></div>
        <div className="metric-panel"><span>Do reakcji</span><strong>{pending + below}</strong><small>status lub niski wynik</small></div>
      </section>
      <section className="data-panel">
        <div className="section-title"><span>Specjaliści zespolu</span><small>{specialistRows.length} osob</small></div>
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

/*
function AssessmentTable({
  assessments,
  compact = false,
  onPreview,
  onPrint,
  onEdit,
  canEditItem,
  onAdvance,
  canAdvanceItem,
}: {
  assessments: Assessment[]
  compact?: boolean
  onPreview?: (assessment: Assessment) => void
  onPrint?: (assessment: Assessment) => void
  onEdit?: (assessment: Assessment) => void
  canEditItem?: (assessment: Assessment) => boolean
  onAdvance?: (assessment: Assessment) => void
  canAdvanceItem?: (assessment: Assessment) => boolean
}) {
  if (!assessments.length) return <div className="empty-state">Brak danych dla aktualnych filtrów.</div>
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
            {!compact ? <th>Oceniający</th> : null}
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
                    {onPreview ? <button type="button" onClick={() => onPreview(item)} title="Podgląd"><Eye size={15} /></button> : null}
                    {onPrint ? <button type="button" onClick={() => onPrint(item)} title="Drukuj"><FileText size={15} /></button> : null}
                    {onEdit && (!canEditItem || canEditItem(item)) ? <button type="button" onClick={() => onEdit(item)} title="Edytuj"><Edit3 size={15} /></button> : null}
                    {onAdvance && (!canAdvanceItem || canAdvanceItem(item)) ? <button type="button" onClick={() => onAdvance(item)} title="Zmien status"><ShieldCheck size={15} /></button> : null}
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
            <p>{assessment.spec} • {assessment.period} • {statusLabels[assessment.status]}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="preview-grid">
          <div><span>Stanowisko</span><strong>{assessment.stand || '-'}</strong></div>
          <div><span>Dział</span><strong>{assessment.dzial || '-'}</strong></div>
          <div><span>Oceniający</span><strong>{assessment.oce || '-'}</strong></div>
          <div><span>Data</span><strong>{assessment.data}</strong></div>
          <div><span>Wynik</span><strong className={scoreClass(assessment.avgFinal)}>{assessment.avgFinal}%</strong></div>
        </div>
        <div className="preview-meta-grid">
          <section>
            <h4>Podsumowanie oceny</h4>
            <p>{assessment.notes || 'Brak opisu koncowego dla tej karty.'}</p>
          </section>
          <section>
            <h4>Zakres materialu</h4>
            <div className="preview-pill-row">
              {assessment.ids.length ? assessment.ids.map((item) => <span key={item}>{item}</span>) : <span>Brak identyfikatorow kontaktu</span>}
            </div>
            <small>{assessment.goldDesc || 'Bez dodatkowych zlotych punktow.'}</small>
          </section>
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
              <span>{new Date(item.at).toLocaleString('pl-PL')} • {item.by || 'system'}</span>
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
  user,
  onClose,
  onSave,
}: {
  assessment: Assessment
  user: UserProfile
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
      const historyNote = assessment.oce === (user.fullName || user.email)
        ? 'Edytowano karte przez oceniajacego'
        : 'Edytowano karte przez osobe z uprawnieniami'
      await onSave({
        ...recalculated,
        id: assessment.id,
        status: assessment.status,
        statusHistory: [
          ...(assessment.statusHistory || []),
          {
            status: assessment.status,
            at: new Date().toISOString(),
            by: user.fullName || user.email,
            note: historyNote,
          },
        ],
        createdAt: assessment.createdAt,
        leaderScope: assessment.leaderScope,
      })
      onClose()
    } catch (err) {
      setError(readableError(err, 'Nie udało się zapisać zmian w karcie.'))
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
            <p>{assessment.spec} • wynik po zmianach {calculated.avgFinal}%</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>
        {error ? <div className="error-box modal-error">{error}</div> : null}
        <div className="field-grid two">
          <label><span>Specjalista</span><input value={draft.specialist} onChange={(event) => setDraft({ ...draft, specialist: event.target.value })} /></label>
          <label><span>Data</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value, period: periodOf(event.target.value) })} /></label>
          <label><span>Stanowisko</span><input value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })} /></label>
          <label><span>Dział</span><input value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} /></label>
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
  const canAdvanceStatuses = user.role === 'admin' || user.role === 'director' || user.role === 'leader'
  const rows = useMemo(() => assessments.filter((item) => {
    const matchesQuery = `${item.spec} ${item.dzial} ${item.oce}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery
      && (type === 'all' || item.type === type)
      && (status === 'all' || item.status === status)
      && (period === 'all' || item.period === period)
  }), [assessments, period, query, status, type])
  const periods = useMemo(() => uniqueSorted(assessments.map((item) => item.period)), [assessments])

  function canEditRow(item: Assessment) {
    return canEditAssessmentForUser(user, item)
  }

  function canAdvanceRow(item: Assessment) {
    return canAdvanceStatuses && (user.role !== 'leader' || item.leaderScope === user.leaderScope)
  }

  async function advance(item: Assessment) {
    if (!canAdvanceRow(item)) {
      setNotice('Ta rola nie moze zmieniac statusu tej karty.')
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
      setNotice(readableError(error, 'Nie udało się zmienic statusu.'))
    }
  }

  function openEditor(item: Assessment) {
    if (!canEditRow(item)) {
      setNotice('Nie masz uprawnien do edycji tej karty.')
      return
    }
    setEditing(item)
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

  async function exportRows(kind: 'csv' | 'excel' | 'json') {
    try {
      if (kind === 'csv') exportCsv(rows)
      if (kind === 'excel') await exportExcel(rows)
      if (kind === 'json') exportJson(rows)
      setNotice(`Eksport ${kind.toUpperCase()} przygotowany dla ${rows.length} pozycji.`)
    } catch (error) {
      setNotice(readableError(error, 'Nie udało się przygotowac eksportu.'))
    }
  }

  function printRow(item: Assessment) {
    if (!printAssessment(item)) setNotice('Przeglądarka zablokowała nowe okno drukowania/PDF.')
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
        <button className="ghost-btn" type="button" onClick={() => void exportRows('csv')}><Download size={16} /> CSV</button>
        <button className="ghost-btn" type="button" onClick={() => void exportRows('excel')}><Download size={16} /> Excel</button>
        <button className="ghost-btn" type="button" onClick={() => void exportRows('json')}><Download size={16} /> JSON</button>
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
          onEdit={canMutate ? openEditor : undefined}
          canEditItem={canEditRow}
          onAdvance={canAdvanceStatuses ? (item) => void advance(item) : undefined}
          canAdvanceItem={canAdvanceRow}
        />
        <div className="row-action-strip">
          {canAdvanceStatuses ? rows.filter(canAdvanceRow).slice(0, 6).map((item) => (
            <button key={item.id} className="ghost-btn" type="button" onClick={() => advance(item)}>
              {item.spec}: {statusLabels[item.status]} â†’
            </button>
          )) : <span className="hint-text">Tryb tylko do odczytu: podglad i eksporty pozostaja dostepne.</span>}
        </div>
      </section>
      {selected ? <AssessmentPreviewModal assessment={selected} onClose={() => setSelected(null)} onPrint={printRow} /> : null}
      {editing ? <AssessmentEditModal assessment={editing} user={user} onClose={() => setEditing(null)} onSave={onUpdate} /> : null}
    </main>
  )
}

/*
type DashboardPanelKey = 'trend' | 'typeMix' | 'sections' | 'leaders' | 'weak' | 'lowScores'
type DashboardDensity = 'comfortable' | 'compact'
type DashboardLayout = 'grid' | 'focus'
type DashboardPrefs = { order: DashboardPanelKey[]; hidden: DashboardPanelKey[]; density: DashboardDensity; layout: DashboardLayout }

const dashboardPanelLabels: Record<DashboardPanelKey, string> = {
  trend: 'Trend okresowy',
  typeMix: 'Rozklad typow',
  sections: 'Sekcje jakości',
  leaders: 'Ranking liderów',
  weak: 'Słabe kryteria',
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
      const current = buckets.get(key) || { label: `${TYPE_LABELS[assessment.type]} • ${section.label}`, sum: 0, count: 0 }
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
        const current = buckets.get(key) || { label: `${TYPE_LABELS[assessment.type]} • ${criterion.name}`, sum: 0, count: 0 }
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
      ['Poniżej standardu', belowCount],
      ['Kolejka decyzyjna', reviewCount],
      ['Filtr okresu', filters.period],
      ['Filtr typu', filters.type],
      ['Filtr lidera', filters.leader],
      ['Filtr specjalisty', filters.specialist],
    ]
    const trendRows = [['Okres', 'Karty', 'Średnia', 'Poniżej standardu', 'Do decyzji'], ...trend.map((item) => [item.period, item.count, `${item.avg}%`, item.below, item.review])]
    const leaderRows = [['Lider', 'Karty', 'Średnia', 'Poniżej standardu', 'Do decyzji'], ...leaders.map((item) => [item.leader, item.count, `${item.avg}%`, item.below, item.review])]
    const weakRows = [['Kryterium', 'Średnia', 'Liczba ocen'], ...weak.map((item) => [item.label, `${item.avg}%`, item.count])]
    const blocks = [
      ['Podsumowanie dashboardu'],
      ...summary,
      [],
      ['Trend okresowy'],
      ...trendRows,
      [],
      ['Ranking liderów'],
      ...leaderRows,
      [],
      ['Słabe kryteria'],
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
      ['Widoczne widgety', String(visiblePanels.length)],
      ['Ukryte widgety', String(prefs.hidden.length)],
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
                  <small>{item.below} nisko • {item.review} decyzji</small>
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
        <DashboardWidget panel={panel} title="Sekcje jakości" subtitle="od najsłabszej" onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel}>
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
        <DashboardWidget panel={panel} title="Słabe kryteria" subtitle="kolejka coachingowa" onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel}>
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
        <DashboardWidget panel={panel} title="Ranking liderów" subtitle="srednia i kolejka decyzji" onHide={hidePanel} onDragStart={setDragging} onDrop={movePanel}>
          <div className="leader-board">
            {leaders.map((item, index) => (
              <div className="leader-row" key={item.leader}>
                <div className="leader-rank">{index < 3 ? <Trophy size={15} /> : index + 1}</div>
                <div>
                  <strong>{item.leader}</strong>
                  <span>{item.count} kart • {item.review} do decyzji • {item.below} nisko</span>
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
          <div className="section-title"><span>Dashboard jakości</span><small>{active.length} kart w aktywnym filtrze</small></div>
          <h1>Interaktywny pulpit wynikow, celow i ryzyk zespolu.</h1>
          <p className="hint-text">Przeciągaj sekcje za uchwyt, ukrywaj mniej potrzebne widgety i przełączaj gęstość układu. Preferencje zapiszą się lokalnie.</p>
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
        <div className="metric-panel premium"><span>Poniżej standardu</span><strong>{belowCount}</strong><small>wymaga reakcji</small></div>
      </section>
      <div className="analytics-grid movable-grid">
        {allPanelsHidden ? (
          <section className="empty-dashboard">
            <Settings size={34} />
            <h3>Wszystkie widgety są ukryte</h3>
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
        <button className="drag-handle" type="button" title="Przeciągnij panel"><GripVertical size={16} /></button>
        <div className="section-title"><span>{title}</span><small>{subtitle}</small></div>
        <button className="widget-icon-btn" type="button" onClick={() => onHide(panel)} title="Ukryj panel"><EyeOff size={15} /></button>
      </div>
      {children}
    </section>
  )
}

*/

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
    const nextDraft = draftHasContent(draft)
      ? { ...draft, savedAt: new Date().toISOString() }
      : undefined
    const next = { ...drafts, [draft.type]: nextDraft }
    setDrafts(next)
    await provider.saveDrafts(next)
  }

  async function saveAssessment(draft: AssessmentDraft) {
    if (!user) return
    const assessment = draftToAssessment(draft, user.leaderScope || draft.assessor)
    await provider.saveAssessment(assessment)
    const nextDrafts = { ...drafts, [draft.type]: undefined }
    setDrafts(nextDrafts)
    await provider.saveDrafts(nextDrafts)
    const all = await provider.loadAssessments()
    setAssessments(scopedAssessments(all, user))
    setView('registry')
  }

  async function clearDraft(type: AssessmentType) {
    const nextDrafts = { ...drafts, [type]: undefined }
    setDrafts(nextDrafts)
    await provider.saveDrafts(nextDrafts)
  }

  function resumeDraft(type: AssessmentType) {
    setActiveType(type)
    setView('form')
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
    <AppShell user={user} providerMode={provider.mode} view={effectiveView} setView={setView} onViewIntent={preloadView} onLogout={logout} systemNotice={bootError}>
      {effectiveView === 'start' ? (
        <StartView
          user={user}
          assessments={assessments}
          drafts={drafts}
          setView={setView}
          onResumeDraft={resumeDraft}
          onClearDraft={(type) => void clearDraft(type)}
        />
      ) : null}
      {effectiveView === 'form' && canCreate(user) ? (
        <EvaluationView
          user={user}
          admin={admin}
          draft={activeDraft}
          onSelectType={setActiveType}
          onDraftChange={updateDraft}
          onSaveAssessment={saveAssessment}
        />
      ) : null}
      {effectiveView === 'team' ? <TeamView user={user} admin={admin} assessments={assessments} setView={setView} /> : null}
      {effectiveView === 'registry' ? <RegistryView assessments={assessments} user={user} onUpdate={updateAssessment} onBulkImport={bulkImportAssessments} /> : null}
      {effectiveView === 'dashboard' ? (
        <Suspense fallback={lazyViewFallback}>
          <DashboardView
            assessments={assessments}
            goals={admin.goals}
            renderAssessmentTable={(rows) => <AssessmentTable assessments={rows} compact />}
          />
        </Suspense>
      ) : null}
      {effectiveView === 'reports' ? (
        <Suspense fallback={lazyViewFallback}>
          <ReportsView assessments={assessments} />
        </Suspense>
      ) : null}
      {effectiveView === 'admin' && canAdmin(user) ? (
        <Suspense fallback={lazyViewFallback}>
          <AdminView
            key={`${users.map((item) => item.id).join('|')}::${admin.specialists.map((item) => item.id).join('|')}::${admin.periods.map((item) => item.code).join('|')}`}
            user={user}
            admin={admin}
            users={users}
            onAdminChange={updateAdmin}
            onUserSave={saveManagedUser}
            onUserCreate={createManagedUser}
          />
        </Suspense>
      ) : null}
    </AppShell>
  )
}

export default App

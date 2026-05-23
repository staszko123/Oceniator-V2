import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { BarChart3, ClipboardCheck, Database, FileBarChart, LayoutDashboard, LogOut,  MonitorCog, Moon, PanelRight, PhoneCall, Settings, ShieldCheck, Sun, UserRound, Users } from 'lucide-react'
import { createDraft, draftHasContent, draftToAssessment } from './domain/scoring'
import { buildDemoAdmin } from './data/seed'
import { createProvider } from './data/supabaseProvider'
import EvaluationView from './features/evaluation/EvaluationView'
import StartView from './features/start/StartView'
import { AssessmentTable } from './features/registry/AssessmentTable'
import RegistryView from './features/registry/RegistryView'
import TeamView from './features/team/TeamView'
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

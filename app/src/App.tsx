import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { BarChart3, ClipboardCheck, Database, FileBarChart, Layers3, LayoutDashboard, Moon, PanelRight, PhoneCall, Settings, ShieldCheck, Sparkles, Sun, Users } from 'lucide-react'
import { createDraft, draftHasContent, draftToAssessment } from './domain/scoring'
import { clearDraft as clearDraftState, commitDraftAfterSave, mergeImportedAssessments, prependManagedUser, replaceAssessmentById, replaceManagedUserById } from './domain/workflows'
import { buildDemoAdmin } from './data/seed'
import { createProvider } from './data/supabaseProvider'
import { canAdminRole, canCreateRole, canViewTeamRole, scopeAssessmentsForUser } from './domain/access'
import AppShell from './features/shell/AppShell'
import { getErrorMessage } from './domain/errors'
import { loadDiagnostics, recordDiagnostic, type DiagnosticEvent } from './domain/diagnostics'
import type {
  AdminConfig,
  AdminHistoryEntry,
  Assessment,
  AssessmentDraft,
  AssessmentType,
  DataProvider,
  ManagedUser,
  UserProfile,
} from './domain/types'
import { useTheme } from './lib/theme'
import { useLanguage } from './i18n/LanguageContext'
import { setProviderMode } from './services/settingsService'
import './index.css'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'
type RegistryIntentPreset = 'all' | 'decision' | 'recent' | 'edited'

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

const EvaluationView = lazy(() => import('./features/evaluation/EvaluationView'))
const StartView = lazy(() => import('./features/start/StartView'))
const RegistryView = lazy(() => import('./features/registry/RegistryView'))
const TeamView = lazy(() => import('./features/team/TeamView'))
const ViewerPortalView = lazy(() => import('./features/viewer/ViewerPortalView'))
const ReportsView = lazy(() => import('./features/reports/ReportsView'))
const AdminView = lazy(() => import('./features/admin/AdminView'))
const DashboardView = lazy(() => import('./features/dashboard/DashboardView'))
const lazyViewFallback = (
  <main className="screen">
    <div className="empty-state">{'\u0141adowanie widoku...'}</div>
  </main>
)

const lazyViewLoaders: Partial<Record<ViewKey, () => Promise<unknown>>> = {
  start: () => import('./features/start/StartView'),
  form: () => import('./features/evaluation/EvaluationView'),
  team: () => import('./features/team/TeamView'),
  registry: () => import('./features/registry/RegistryView'),
  dashboard: () => import('./features/dashboard/DashboardView'),
  reports: () => import('./features/reports/ReportsView'),
  admin: () => import('./features/admin/AdminView'),
}

function preloadView(view: ViewKey) {
  void lazyViewLoaders[view]?.()
}

function availableNavItems(user: UserProfile): typeof navItems {
  if (user.role === 'viewer') {
    const startItem = navItems.find((item) => item.key === 'start')
    const registryItem = navItems.find((item) => item.key === 'registry')
    return [
      startItem ? { ...startItem, label: 'Mój portal', icon: ShieldCheck } : null,
      registryItem ? { ...registryItem, label: 'Moje oceny' } : null,
    ].filter((item): item is (typeof navItems)[number] => Boolean(item))
  }
  return navItems.filter((item) => {
    if (item.key === 'form') return canCreateRole(user.role)
    if (item.key === 'team') return canViewTeamRole(user.role)
    if (item.key === 'admin') return canAdminRole(user.role)
    return true
  })
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
  const { t } = useLanguage()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [introDone, setIntroDone] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroDone(true), 5800)
    return () => window.clearTimeout(timer)
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(login, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error.default', 'Nie udało się zalogować.'))
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
      setError(getErrorMessage(err, t('login.error.demo', 'Nie udało się uruchomić lokalnego demo.')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className={`login-intro ${introDone ? 'done' : ''}`} aria-hidden="true">
          <div className="login-orb orb-a" />
          <div className="login-orb orb-b" />
          <div className="login-orb orb-c" />
          <div className="login-wave" />
          <div className="login-liquid-card glass-card one">
            <span><Sparkles size={14} /> {t('login.hero.glass', 'Liquid glass')}</span>
            <strong>{t('login.hero.material', 'Material start')}</strong>
            <small>{t('login.hero.glassDesc', 'Miękki ruch, szkło i płynne przejścia.')}</small>
          </div>
          <div className="login-liquid-card glass-card two">
            <span><Layers3 size={14} /> {t('login.hero.portal', 'Portal quality')}</span>
            <strong>{t('login.hero.title', 'Ocena i ewidencja')}</strong>
            <small>{t('login.hero.portalDesc', 'Jedno wejście, jeden rytm pracy.')}</small>
          </div>
          <div className="login-liquid-signal">
            <i />
            <span>{t('login.hero.session', 'Start sesji')}</span>
          </div>
        </div>
        <div className="brand-mark">
          <span />
          <div>
            <strong>Oceniator</strong>
            <small>{t('login.brand.subtitle', 'Platforma oceny jakości')}</small>
          </div>
        </div>
        <div className="login-copy">
          <span className="login-kicker">{t('login.kicker', 'System operacyjny dla jakości')}</span>
          <h1>{t('login.title', 'Ocena, ewidencja i raporty w jednym czystym miejscu.')}</h1>
          <p>{t('login.description', 'To jest produkcyjny ekran dostępu do pracy. Wchodzisz do aplikacji bez marketingowego hałasu i bez dodatkowych ekranów po drodze.')}</p>
          <div className="login-points">
            <div className="login-point"><ShieldCheck size={16} /> <span>{t('login.point.roles', 'Role i zakresy dostępu')}</span></div>
            <div className="login-point"><Database size={16} /> <span>{t('login.point.storage', 'Supabase albo lokalne demo')}</span></div>
            <div className="login-point"><PanelRight size={16} /> <span>{t('login.point.fast', 'Jeden login, szybkie wejście')}</span></div>
          </div>
        </div>
      </section>
      <section className="login-card">
        <div className="section-title login-card-head">
          <div>
            <span>{provider.mode === 'supabase' ? t('login.mode.supabase', 'Logowanie') : t('login.mode.local', 'Logowanie lokalne')}</span>
            <p className="login-card-copy">{t('login.cardCopy', 'Zaloguj się i kontynuuj pracę bez dodatkowych ekranów.')}</p>
          </div>
          <button className="theme-toggle" type="button" onClick={toggleTheme} title={t('action.theme', 'Przełącz motyw')}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === 'dark' ? t('theme.light', 'Jasny') : t('theme.dark', 'Ciemny')}</span>
          </button>
        </div>
        <form onSubmit={submit} className="stack">
          <label>
            <span>{provider.mode === 'supabase' ? t('login.email', 'Adres e-mail') : t('login.localLogin', 'Login lokalny')}</span>
            <input value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" autoFocus />
          </label>
          <label>
            <span>{t('login.password', 'Hasło')}</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </label>
          {error ? <div className="error-box">{error}</div> : null}
          <button className="primary-btn" disabled={busy} type="submit">
            {busy ? t('login.loggingIn', 'Logowanie...') : t('login.submit', 'Zaloguj się')}
          </button>
        </form>
        <div className="login-footer">
          <button className="ghost-btn wide" type="button" disabled={busy} onClick={() => void startLocalDemo()}>
            {t('login.demoButton', 'Uruchom demo lokalne')}
          </button>
          <p className="hint-text">{t('login.demoAccounts', 'Konta testowe: ')}{localDemoAccounts}.</p>
        </div>
      </section>
    </main>
  )
}

function App() {
  const { t } = useLanguage()
  const [provider, setProvider] = useState<DataProvider>(() => createProvider())
  const [user, setUser] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [admin, setAdmin] = useState<AdminConfig | null>(null)
  const [adminHistory, setAdminHistory] = useState<AdminHistoryEntry[]>([])
  const [diagnostics, setDiagnostics] = useState<DiagnosticEvent[]>(() => loadDiagnostics())
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [drafts, setDrafts] = useState<Record<AssessmentType, AssessmentDraft | undefined>>({ r: undefined, m: undefined, s: undefined })
  const [view, setView] = useState<ViewKey>('start')
  const [activeType, setActiveType] = useState<AssessmentType>('r')
  const [formDraftOverride, setFormDraftOverride] = useState<AssessmentDraft | null>(null)
  const [specialistPrefill, setSpecialistPrefill] = useState<{ name: string; token: number } | null>(null)
  const [registryIntent, setRegistryIntent] = useState<{ preset: RegistryIntentPreset; token: number } | null>(null)
  const [bootError, setBootError] = useState('')
  const refreshDiagnostics = useCallback((event: Parameters<typeof recordDiagnostic>[0]) => {
    recordDiagnostic(event)
    setDiagnostics(loadDiagnostics())
  }, [])

  const loadWorkspace = useCallback(async (currentUser: UserProfile, activeProvider = provider) => {
    setBootError('')
    const canReadAdminData = canAdminRole(currentUser.role)
    const [adminResult, historyResult, assessmentsResult, draftsResult, usersResult] = await Promise.allSettled([
      activeProvider.loadAdmin(),
      canReadAdminData && activeProvider.loadAdminHistory ? activeProvider.loadAdminHistory() : Promise.resolve([]),
      activeProvider.loadAssessments(),
      activeProvider.loadDrafts(),
      canReadAdminData && activeProvider.listUsers ? activeProvider.listUsers() : Promise.resolve([]),
    ])
    const failures = [adminResult, historyResult, assessmentsResult, draftsResult, usersResult]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => getErrorMessage(result.reason, t('app.error.loadData', 'Błąd pobierania danych.')))
    const nextAdmin = adminResult.status === 'fulfilled' ? adminResult.value : buildDemoAdmin()
    const nextHistory = historyResult.status === 'fulfilled' ? historyResult.value : []
    const nextAssessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : []
    const nextDrafts = draftsResult.status === 'fulfilled' ? draftsResult.value : { r: undefined, m: undefined, s: undefined }
    const nextUsers = usersResult.status === 'fulfilled' ? usersResult.value : []
    setUser(currentUser)
    setUsers(nextUsers)
    setAdmin(nextAdmin)
    setAdminHistory(nextHistory)
    setAssessments(scopeAssessmentsForUser(nextAssessments, currentUser))
    setDrafts(nextDrafts)
    setFormDraftOverride(null)
    setView(currentUser.role === 'viewer' ? 'registry' : 'start')
    if (failures.length) setBootError(`Część danych jest chwilowo niedostępna: ${failures.join(' ')}`)
    refreshDiagnostics({
      scope: 'system',
      action: 'workspace-load',
      detail: failures.length
        ? `Wczytano z ostrzezeniami: ${failures.length} sekcji`
        : `Wczytano zestaw danych dla ${currentUser.fullName || currentUser.email}`,
      level: failures.length ? 'warning' : 'success',
    })
  }, [provider, refreshDiagnostics, t])

  useEffect(() => {
    provider.getCurrentUser()
      .then((currentUser) => {
        if (currentUser) return loadWorkspace(currentUser)
        return undefined
      })
      .catch((error) => {
        setBootError(getErrorMessage(error, t('app.error.boot', 'Błąd startu aplikacji.')))
        refreshDiagnostics({
          scope: 'system',
          action: 'boot-error',
          detail: getErrorMessage(error, t('app.error.boot', 'Błąd startu aplikacji.')),
          level: 'error',
        })
      })
  }, [provider, loadWorkspace, refreshDiagnostics, t])

  async function login(loginValue: string, password: string) {
    const currentUser = await provider.signIn(loginValue, password)
    setProviderMode(provider.mode)
    await loadWorkspace(currentUser)
    refreshDiagnostics({
      scope: 'auth',
      action: 'sign-in',
      detail: `Zalogowano jako ${currentUser.fullName || currentUser.email}`,
      level: 'success',
    })
  }

  async function localDemo() {
    setProviderMode('local')
    const local = createProvider(true)
    setProvider(local)
    const currentUser = await local.signIn('admin', 'admin123')
    await loadWorkspace(currentUser, local)
    refreshDiagnostics({
      scope: 'auth',
      action: 'local-demo',
      detail: `Uruchomiono lokalne demo jako ${currentUser.fullName || currentUser.email}`,
      level: 'success',
    })
  }

  async function logout() {
    await provider.signOut()
    setUser(null)
    setUsers([])
    setAdmin(null)
    setAdminHistory([])
    setAssessments([])
    setFormDraftOverride(null)
    setView('start')
    refreshDiagnostics({
      scope: 'auth',
      action: 'sign-out',
      detail: 'Wylogowano uzytkownika',
      level: 'info',
    })
  }

  async function updateDraft(draft: AssessmentDraft) {
    setActiveType(draft.type)
    const nextDraft = draftHasContent(draft)
      ? { ...draft, savedAt: new Date().toISOString() }
      : undefined
    if (formDraftOverride?.type === draft.type) {
      setFormDraftOverride(nextDraft || createDraft(draft.type))
    }
    const next = { ...drafts, [draft.type]: nextDraft }
    setDrafts(next)
    await provider.saveDrafts(next)
  }

  async function saveAssessment(draft: AssessmentDraft) {
    if (!user) return
    const assessment = draftToAssessment(draft, user.leaderScope || draft.assessor)
    await provider.saveAssessment(assessment)
    const nextDrafts = commitDraftAfterSave(drafts, draft.type)
    setDrafts(nextDrafts)
    await provider.saveDrafts(nextDrafts)
    const all = await provider.loadAssessments()
    setAssessments(scopeAssessmentsForUser(all, user))
    setFormDraftOverride(null)
    setView('registry')
    refreshDiagnostics({
      scope: 'assessment',
      action: 'save',
      detail: `${assessment.spec} - ${assessment.type.toUpperCase()} ${assessment.avgFinal}%`,
      level: 'success',
    })
  }

  async function discardDraft(type: AssessmentType) {
    const nextDrafts = clearDraftState(drafts, type)
    setDrafts(nextDrafts)
    if (formDraftOverride?.type === type) setFormDraftOverride(createDraft(type))
    await provider.saveDrafts(nextDrafts)
    refreshDiagnostics({
      scope: 'draft',
      action: 'clear',
      detail: `Wyczyszczono szkic ${type}`,
      level: 'info',
    })
  }

  function resumeDraft(type: AssessmentType) {
    setFormDraftOverride(null)
    setActiveType(type)
    setView('form')
  }

  function startAssessmentForSpecialist(name: string) {
    setActiveType('r')
    setFormDraftOverride(createDraft('r'))
    setSpecialistPrefill({ name, token: Date.now() })
    setView('form')
  }

  function openRegistry(preset: RegistryIntentPreset = 'all') {
    setRegistryIntent({ preset, token: Date.now() })
    setView('registry')
  }

  async function updateAssessment(assessment: Assessment) {
    if (!user) return
    await provider.updateAssessment(assessment)
    const all = await provider.loadAssessments()
    setAssessments(scopeAssessmentsForUser(replaceAssessmentById(all, assessment), user))
  }

  async function bulkImportAssessments(imported: Assessment[]) {
    if (!user) return
    const existing = await provider.loadAssessments()
    const merged = mergeImportedAssessments(existing, imported)
    if (provider.saveAssessments) {
      await provider.saveAssessments(merged)
    } else {
      await Promise.all(imported.map((item) => provider.saveAssessment(item)))
    }
    const all = await provider.loadAssessments()
    setAssessments(scopeAssessmentsForUser(all, user))
    refreshDiagnostics({
      scope: 'registry',
      action: 'import',
      detail: `Zaimportowano ${imported.length} kart`,
      level: 'success',
    })
  }

  async function updateAdmin(nextAdmin: AdminConfig) {
    await provider.saveAdmin(nextAdmin)
    setAdmin(nextAdmin)
    refreshDiagnostics({
      scope: 'admin',
      action: 'save-config',
      detail: 'Zapisano konfiguracje administratora',
      level: 'success',
    })
  }

  async function saveManagedUser(nextUser: ManagedUser) {
    if (!provider.updateUser) return
    const saved = await provider.updateUser(nextUser)
    const nextUsers = replaceManagedUserById(users, saved)
    setUsers(nextUsers)
    if (user?.id === saved.id) setUser(saved)
    refreshDiagnostics({
      scope: 'admin',
      action: 'update-user',
      detail: `Zaktualizowano konto ${saved.email || saved.login}`,
      level: 'success',
    })
  }

  async function createManagedUser(nextUser: ManagedUser): Promise<ManagedUser> {
    if (!provider.createUser) throw new Error('Provider nie obsluguje tworzenia uzytkownikow.')
    const created = await provider.createUser(nextUser)
    setUsers(prependManagedUser(users, created))
    refreshDiagnostics({
      scope: 'admin',
      action: 'create-user',
      detail: `Utworzono konto ${created.email || created.login}`,
      level: 'success',
    })
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

  const activeDraft = formDraftOverride?.type === activeType
    ? formDraftOverride
    : drafts[activeType] || createDraft(activeType)
  const visibleNavItems = availableNavItems(user)
  const effectiveView = visibleNavItems.some((item) => item.key === view) ? view : 'start'

  return (
    <Suspense fallback={lazyViewFallback}>
      <AppShell user={user} providerMode={provider.mode} view={effectiveView} navItems={visibleNavItems} setView={setView} onViewIntent={preloadView} onLogout={logout} systemNotice={bootError}>
        {effectiveView === 'start' ? (
          user.role === 'viewer' ? (
            <ViewerPortalView user={user} assessments={assessments} goals={admin.goals} />
          ) : (
            <StartView
              user={user}
              assessments={assessments}
              drafts={drafts}
              setView={setView}
              openRegistry={openRegistry}
              onResumeDraft={resumeDraft}
              onClearDraft={(type) => void discardDraft(type)}
            />
          )
        ) : null}
        {effectiveView === 'form' && canCreateRole(user.role) ? (
          <EvaluationView
            user={user}
            admin={admin}
            draft={activeDraft}
            specialistPrefillName={specialistPrefill?.name}
            specialistPrefillToken={specialistPrefill?.token}
            onSelectType={(type) => {
              setActiveType(type)
              if (formDraftOverride && formDraftOverride.type !== type) setFormDraftOverride(null)
            }}
            onDraftChange={updateDraft}
            onSaveAssessment={saveAssessment}
          />
        ) : null}
        {effectiveView === 'team' ? <TeamView user={user} admin={admin} assessments={assessments} setView={setView} openRegistry={openRegistry} onStartAssessmentForSpecialist={startAssessmentForSpecialist} /> : null}
        {effectiveView === 'registry' ? <RegistryView assessments={assessments} user={user} intentPreset={registryIntent?.preset} intentToken={registryIntent?.token} onUpdate={updateAssessment} onBulkImport={bulkImportAssessments} /> : null}
        {effectiveView === 'dashboard' ? (
          <DashboardView
            userRole={user.role}
            assessments={assessments}
            goals={admin.goals}
            setView={setView}
            openRegistry={openRegistry}
          />
        ) : null}
        {effectiveView === 'reports' ? (
          <ReportsView assessments={assessments} setView={setView} openRegistry={openRegistry} onStartAssessmentForSpecialist={startAssessmentForSpecialist} />
        ) : null}
        {effectiveView === 'admin' && canAdminRole(user.role) ? (
          <AdminView
            key={`${users.map((item) => item.id).join('|')}::${admin.specialists.map((item) => item.id).join('|')}::${admin.periods.map((item) => item.code).join('|')}`}
            user={user}
            admin={admin}
            adminHistory={adminHistory}
            diagnostics={diagnostics}
            users={users}
            onAdminChange={updateAdmin}
            onUserSave={saveManagedUser}
            onUserCreate={createManagedUser}
          />
        ) : null}
      </AppShell>
    </Suspense>
  )
}

export default App

import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { LogIn } from 'lucide-react'
import { createDraft, draftHasContent, draftToAssessment } from './domain/scoring'
import { clearDraft as clearDraftState, commitDraftAfterSave, mergeImportedAssessments, prependManagedUser, replaceAssessmentById, replaceManagedUserById } from './domain/workflows'
import { createProvider } from './data/supabaseProvider'
import { canAdminRole, canCreateRole, canViewTeamRole, isViewerRole, scopeAssessmentsForUser } from './domain/access'
import AppShell from './features/shell/AppShell'
import { getErrorMessage } from './domain/errors'
import { loadDiagnostics, recordDiagnostic, type DiagnosticEvent } from './domain/diagnostics'
import type {
  AdminConfig,
  AdminHistoryEntry,
  Assessment,
  AssessmentComment,
  AssessmentDraft,
  AssessmentType,
  DataProvider,
  ManagedUser,
  UserProfile,
} from './domain/types'
import type { DashboardPrefs } from './config/dashboard'
import { defaultDashboardPrefs, normalizeDashboardPrefs } from './config/dashboard'
import { navigationConfig, type ViewKey } from './config/navigation'
import { hasPermission } from './config/permissions'
import { userPreferenceKeys } from './config/userPreferences'
import type { Notification } from './types/notification'
import { useLanguage } from './i18n/LanguageContext'
import { getThemePreference, isLocalDemoEnabled, setProviderMode } from './services/settingsService'
import { buildLocationHash, readLocationState, type AppLocationState, type RegistryIntentPreset, type RegistryLocationState } from './lib/locationHash'
import './index.css'
const LOGIN_TRANSITION_KEY = 'oceniator.loginTransition'
const LOGIN_TRANSITION_MS = 920


function createUnavailableAdminConfig(): AdminConfig {
  return {
    specialists: [],
    departments: [],
    positions: [],
    leaders: [],
    periods: [],
    goals: {
      callsPerPeriod: 9,
      mailsPerPeriod: 9,
      systemsPerPeriod: 9,
      minAvg: 92,
      greatShare: 60,
    },
  }
}

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

function availableNavItems(user: UserProfile, t: (key: string, fallback?: string) => string) {
  const canViewTeam = canViewTeamRole(user.role)

  if (!canViewTeam) {
    return navigationConfig
      .filter((item) => item.key === 'start' || item.key === 'registry')
      .map((item) => ({
        key: item.key,
        label: t(item.viewerLabelKey || item.labelKey),
        icon: item.icon,
      }))
  }

  return navigationConfig
    .filter((item) => !item.permission || hasPermission(user.role, item.permission))
    .map((item) => ({
      key: item.key,
      label: t(item.labelKey),
      icon: item.icon,
    }))
}

function LoginScreen({
  provider,
  onLogin,
  onGoogleLogin,
  transitioning,
}: {
  provider: DataProvider
  onLogin: (login: string, password: string) => Promise<void>
  onGoogleLogin: () => Promise<void>
  transitioning: boolean
}) {
  const { t } = useLanguage()
  const demoMode = isLocalDemoEnabled()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const theme = getThemePreference()
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(login, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error.default', 'Nie uda?o si? zalogowa?.'))
    } finally {
      setBusy(false)
    }
  }

  async function startGoogleLogin() {
    setBusy(true)
    setError('')
    try {
      await onGoogleLogin()
    } catch (err) {
      setError(getErrorMessage(err, t('login.error.google', 'Nie uda?o si? uruchomi? logowania Google.')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={'login-page' + (transitioning ? ' is-transitioning' : '')}>
      <img className="login-logo" src="/oceniator-logo-simple.png" alt="Logo Oceniator" />
      <div className={'login-transition' + (transitioning ? ' is-active' : '')} aria-hidden="true">
        <div className="login-transition-sweep" />
        <div className="login-transition-portal" />
        <div className="login-transition-glow" />
      </div>
      <div className="login-backdrop" aria-hidden="true">
        <div className="login-orb orb-a" />
        <div className="login-orb orb-b" />
        <div className="login-orb orb-c" />
        <div className="login-orb orb-d" />
        <div className="login-orb orb-e" />
        <div className="login-orb orb-f" />
        <div className="login-orb orb-g" />
        <div className="login-orb orb-h" />
        <div className="login-orb orb-i" />
        <div className="login-orb orb-j" />
        <div className="login-orb orb-k" />
      </div>
      <section className="login-shell">
        <div className="brand-mark">
          <strong>{t('login.brand.title', 'Portal jakości')}</strong>
          <small>{demoMode ? t('login.mode.local', 'Lokalnie') : t('login.brand.subtitle', 'Portal jakości')}</small>
        </div>
        <section className="login-card">
          <div className="login-card-copy">
            <span>{demoMode ? t('login.mode.local', 'Lokalnie') : t('login.mode.google', 'Google')}</span>
            <p>{demoMode ? t('login.cardCopy', 'Tryb lokalny dla dewelopera.') : t('login.cardCopyGoogle', 'Konto Google przez Supabase Auth.')}</p>
          </div>
          {provider.mode === 'supabase' ? (
            <div className="stack">
              {error ? <div className="error-box">{error}</div> : null}
              <button className="primary-btn" disabled={busy} type="button" onClick={() => void startGoogleLogin()}>
                {busy ? t('login.loggingIn', 'Logowanie...') : <><LogIn size={16} /> {t('login.googleButton', 'Zaloguj przez Google')}</>}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="stack">
              <label>
                <span>{t('login.localLogin', 'Login lokalny')}</span>
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
          )}
        </section>
      </section>
      <div className="desktop-guard">
        <div className="desktop-guard-card">
          <strong>{t('layout.desktopOnlyTitle')}</strong>
          <p>{t('layout.desktopOnlyDescription')}</p>
        </div>
      </div>
      <div className="login-watermark" aria-hidden="true">
        <span>© 2026 Jakub Stachura</span>
        <small>Własna praca</small>
      </div>
    </main>
  )
}

function App() {
  const { t } = useLanguage()
  const [provider] = useState<DataProvider>(() => createProvider())
  const [initialLocation] = useState<AppLocationState>(() => readLocationState())
  const [user, setUser] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [admin, setAdmin] = useState<AdminConfig | null>(null)
  const [adminHistory, setAdminHistory] = useState<AdminHistoryEntry[]>([])
  const [dashboardPrefs, setDashboardPrefs] = useState<DashboardPrefs>(defaultDashboardPrefs)
  const [shellCollapsed, setShellCollapsed] = useState(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticEvent[]>(() => loadDiagnostics())
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [drafts, setDrafts] = useState<Record<AssessmentType, AssessmentDraft | undefined>>({ r: undefined, m: undefined, s: undefined })
  const [view, setViewState] = useState<ViewKey>(() => initialLocation.view)
  const [activeType, setActiveType] = useState<AssessmentType>('r')
  const [formDraftOverride, setFormDraftOverride] = useState<AssessmentDraft | null>(null)
  const [specialistPrefill, setSpecialistPrefill] = useState<{ name: string; token: number } | null>(null)
  const [registryIntent, setRegistryIntent] = useState<{ preset: RegistryIntentPreset; token: number } | null>(null)
  const [registryFocus, setRegistryFocus] = useState<{ assessmentId: string; token: number } | null>(null)
  const [bootError, setBootError] = useState('')
  const [loginTransitioning, setLoginTransitioning] = useState(false)
  const refreshDiagnostics = useCallback((event: Parameters<typeof recordDiagnostic>[0]) => {
    recordDiagnostic(event)
    setDiagnostics(loadDiagnostics())
  }, [])
  const applyLocationState = useCallback((nextLocation: AppLocationState) => {
    setViewState(nextLocation.view)
    if (nextLocation.view === 'registry') {
      const registry = nextLocation.registry || { preset: 'all' as RegistryIntentPreset }
      setRegistryIntent({ preset: registry.preset, token: Date.now() })
      setRegistryFocus(registry.focus ? { assessmentId: registry.focus, token: Date.now() } : null)
      return
    }
    if (nextLocation.view === 'form' && nextLocation.form?.type) {
      setActiveType(nextLocation.form.type)
    }
    setRegistryIntent(null)
    setRegistryFocus(null)
  }, [])
  const syncLocationToHash = useCallback((nextLocation: AppLocationState, replace = false) => {
    if (typeof window === 'undefined') return
    const nextUrl = new URL(window.location.href)
    nextUrl.hash = buildLocationHash(nextLocation)
    if (replace) {
      window.history.replaceState(null, '', nextUrl)
      return
    }
    if (window.location.hash === `#${nextUrl.hash.replace(/^#/, '')}`) return
    window.history.pushState(null, '', nextUrl)
  }, [])
  const navigateToView = useCallback((nextView: ViewKey, replace = false, options?: { registry?: RegistryLocationState; formType?: AssessmentType }) => {
    const nextLocation: AppLocationState = nextView === 'registry'
      ? { view: nextView, registry: options?.registry || { preset: 'all' } }
      : nextView === 'form'
        ? { view: nextView, form: { type: options?.formType || activeType } }
        : { view: nextView }
    applyLocationState(nextLocation)
    syncLocationToHash(nextLocation, replace)
  }, [activeType, applyLocationState, syncLocationToHash])

  useEffect(() => {
    function handleLocationChange() {
      applyLocationState(readLocationState())
    }

    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [applyLocationState])

  const loadWorkspace = useCallback(async (currentUser: UserProfile, activeProvider = provider) => {
    setBootError('')
    const canReadAdminData = canAdminRole(currentUser.role)
    const [adminResult, historyResult, assessmentsResult, draftsResult, usersResult, notificationsResult, dashboardPrefsResult, shellCollapsedResult] = await Promise.allSettled([
      activeProvider.loadAdmin(),
      canReadAdminData && activeProvider.loadAdminHistory ? activeProvider.loadAdminHistory() : Promise.resolve([]),
      activeProvider.loadAssessments(),
      activeProvider.loadDrafts(),
      canReadAdminData && activeProvider.listUsers ? activeProvider.listUsers() : Promise.resolve([]),
      activeProvider.loadNotifications(),
      activeProvider.loadUserPreference<Partial<DashboardPrefs> | null>(userPreferenceKeys.dashboardPrefs),
      activeProvider.loadUserPreference<boolean>(userPreferenceKeys.shellCollapsed),
    ])
    const failures = [adminResult, historyResult, assessmentsResult, draftsResult, usersResult, notificationsResult]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => getErrorMessage(result.reason, t('app.error.loadData', 'Błąd pobierania danych.')))
    const nextAdmin = adminResult.status === 'fulfilled' ? adminResult.value : createUnavailableAdminConfig()
    const nextHistory = historyResult.status === 'fulfilled' ? historyResult.value : []
    const nextAssessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : []
    const nextDrafts = draftsResult.status === 'fulfilled' ? draftsResult.value : { r: undefined, m: undefined, s: undefined }
    const nextUsers = usersResult.status === 'fulfilled' ? usersResult.value : []
    const nextNotifications = notificationsResult.status === 'fulfilled' ? notificationsResult.value : []
    const nextDashboardPrefs = dashboardPrefsResult.status === 'fulfilled'
      ? normalizeDashboardPrefs(dashboardPrefsResult.value)
      : defaultDashboardPrefs
    const nextShellCollapsed = shellCollapsedResult.status === 'fulfilled'
      ? Boolean(shellCollapsedResult.value)
      : false
    setUser(currentUser)
    setUsers(nextUsers)
    setAdmin(nextAdmin)
    setAdminHistory(nextHistory)
    setDashboardPrefs(nextDashboardPrefs)
    setShellCollapsed(nextShellCollapsed)
    setNotifications(nextNotifications)
    setAssessments(scopeAssessmentsForUser(nextAssessments, currentUser))
    setDrafts(nextDrafts)
    setFormDraftOverride(null)
    const requestedLocation = readLocationState()
    const allowedViews = availableNavItems(currentUser, t).map((item) => item.key)
    const fallbackView = isViewerRole(currentUser.role) ? 'registry' : 'start'
    const nextView = allowedViews.includes(requestedLocation.view) ? requestedLocation.view : fallbackView
    navigateToView(
      nextView,
      true,
      nextView === 'registry'
        ? { registry: requestedLocation.registry || { preset: 'all' } }
        : nextView === 'form'
          ? { formType: requestedLocation.form?.type }
          : undefined,
    )
    if (failures.length) setBootError(`Część danych jest chwilowo niedostępna: ${failures.join(' ')}`)
    if (failures.length) {
      void activeProvider.pushNotification({
        type: 'syncError',
        title: 'Problem synchronizacji',
        message: 'Część danych jest chwilowo niedostępna.',
        relatedEntityType: 'settings',
      })
        .then(setNotifications)
        .catch(() => undefined)
    }
    refreshDiagnostics({
      scope: 'system',
      action: 'workspace-load',
      detail: failures.length
        ? `Wczytano z ostrzezeniami: ${failures.length} sekcji`
        : `Wczytano zestaw danych dla ${currentUser.fullName || currentUser.email}`,
      level: failures.length ? 'warning' : 'success',
    })
  }, [navigateToView, provider, refreshDiagnostics, t])

  useEffect(() => {
    let cancelled = false
    const transitionRequested = typeof window !== 'undefined' && window.sessionStorage.getItem(LOGIN_TRANSITION_KEY) === '1'
    const boot = async () => {
      try {
        const currentUser = await provider.getCurrentUser()
        if (!currentUser) {
          if (transitionRequested) window.sessionStorage.removeItem(LOGIN_TRANSITION_KEY)
          return
        }
        if (transitionRequested) {
          setLoginTransitioning(true)
          window.sessionStorage.removeItem(LOGIN_TRANSITION_KEY)
          await Promise.all([
            loadWorkspace(currentUser),
            new Promise((resolve) => window.setTimeout(resolve, LOGIN_TRANSITION_MS)),
          ])
          if (!cancelled) setLoginTransitioning(false)
          return
        }
        await loadWorkspace(currentUser)
      } catch (error) {
        if (!cancelled) {
          setBootError(getErrorMessage(error, t('app.error.boot', 'B??d startu aplikacji.')))
          refreshDiagnostics({
            scope: 'system',
            action: 'boot-error',
            detail: getErrorMessage(error, t('app.error.boot', 'B??d startu aplikacji.')),
            level: 'error',
          })
        }
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
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

  async function googleLogin() {
    if (!provider.signInWithGoogle) {
      throw new Error(t('login.error.googleUnavailable', 'Logowanie Google nie jest dostępne w tym środowisku.'))
    }
    window.sessionStorage.setItem(LOGIN_TRANSITION_KEY, '1')
    await provider.signInWithGoogle()
  }

  async function logout() {
    await provider.signOut()
    setUser(null)
    setUsers([])
    setAdmin(null)
    setAdminHistory([])
    setAssessments([])
    setNotifications([])
    setFormDraftOverride(null)
    navigateToView('start', true)
    refreshDiagnostics({
      scope: 'auth',
      action: 'sign-out',
      detail: 'Wylogowano użytkownika',
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
    navigateToView('registry')
    refreshDiagnostics({
      scope: 'assessment',
      action: 'save',
      detail: `${assessment.spec} - ${assessment.type.toUpperCase()} ${assessment.avgFinal}%`,
      level: 'success',
    })
    const minAvg = admin?.goals.minAvg ?? 92
    await pushWorkspaceNotification({
      type: assessment.avgFinal < minAvg ? 'lowScore' : 'saveSuccess',
      title: assessment.avgFinal < minAvg ? 'Niski wynik oceny' : 'Karta zapisana',
      message: `${assessment.spec}: ${assessment.avgFinal}%`,
      relatedEntityType: 'evaluation',
      relatedEntityId: assessment.id,
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
    navigateToView('form', false, { formType: type })
  }

  function startAssessmentForSpecialist(name: string) {
    setActiveType('r')
    setFormDraftOverride(createDraft('r'))
    setSpecialistPrefill({ name, token: Date.now() })
    navigateToView('form', false, { formType: 'r' })
  }

  function openRegistry(preset: RegistryIntentPreset = 'all', focusAssessmentId?: string) {
    navigateToView('registry', false, { registry: focusAssessmentId ? { preset, focus: focusAssessmentId } : { preset } })
  }

  async function pushWorkspaceNotification(payload: Parameters<DataProvider['pushNotification']>[0]) {
    try {
      setNotifications(await provider.pushNotification(payload))
    } catch (error) {
      refreshDiagnostics({
        scope: 'system',
        action: 'push',
        detail: getErrorMessage(error, 'Nie udało się zapisać powiadomienia.'),
        level: 'warning',
      })
    }
  }

  async function markNotificationRead(id: string) {
    try {
      setNotifications(await provider.markNotificationRead(id))
    } catch (error) {
      refreshDiagnostics({
        scope: 'system',
        action: 'mark-read',
        detail: getErrorMessage(error, 'Nie udało się oznaczyć powiadomienia.'),
        level: 'warning',
      })
    }
  }

  async function markAllNotificationsRead() {
    try {
      setNotifications(await provider.markAllNotificationsRead())
    } catch (error) {
      refreshDiagnostics({
        scope: 'system',
        action: 'mark-all-read',
        detail: getErrorMessage(error, 'Nie udało się oznaczyć powiadomień.'),
        level: 'warning',
      })
    }
  }

  function selectNotification(notification: Notification) {
    if (notification.relatedEntityType === 'evaluation' && notification.relatedEntityId) {
      openRegistry('all', notification.relatedEntityId)
    }
  }

  async function loadAssessmentComments(assessmentId: string): Promise<AssessmentComment[]> {
    try {
      return await provider.loadAssessmentComments(assessmentId)
    } catch (error) {
      refreshDiagnostics({
        scope: 'assessment',
        action: 'load-comments',
        detail: getErrorMessage(error, t('app.error.loadComments', 'Błąd pobierania komentarzy.')),
        level: 'warning',
      })
      return []
    }
  }

  async function addAssessmentComment(assessmentId: string, body: string): Promise<AssessmentComment> {
    const comment = await provider.addAssessmentComment(assessmentId, body)
    await pushWorkspaceNotification({
      type: 'newComment',
      title: 'Nowy komentarz',
      message: `${comment.createdByName || user?.fullName || 'Użytkownik'} dodał komentarz.`,
      relatedEntityType: 'evaluation',
      relatedEntityId: assessmentId,
    })
    return comment
  }

  async function updateAssessment(assessment: Assessment) {
    if (!user) return
    await provider.updateAssessment(assessment)
    const all = await provider.loadAssessments()
    setAssessments(scopeAssessmentsForUser(replaceAssessmentById(all, assessment), user))
    await pushWorkspaceNotification({
      type: 'systemAction',
      title: 'Zaktualizowano ocenę',
      message: `${assessment.spec}: ${assessment.status}`,
      relatedEntityType: 'evaluation',
      relatedEntityId: assessment.id,
    })
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
      detail: 'Zapisano konfigurację administratora',
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
    if (!provider.createUser) throw new Error('Provider nie obsługuje tworzenia użytkowników.')
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

  async function saveDashboardPreferences(nextPrefs: DashboardPrefs) {
    const normalized = normalizeDashboardPrefs(nextPrefs)
    setDashboardPrefs(normalized)
    try {
      await provider.saveUserPreference(userPreferenceKeys.dashboardPrefs, normalized)
    } catch (error) {
      refreshDiagnostics({
        scope: 'system',
        action: 'dashboard-prefs',
        detail: getErrorMessage(error, 'Nie udało się zapisać preferencji dashboardu.'),
        level: 'warning',
      })
    }
  }

  async function saveShellCollapsedPreference(nextCollapsed: boolean) {
    setShellCollapsed(nextCollapsed)
    try {
      await provider.saveUserPreference(userPreferenceKeys.shellCollapsed, nextCollapsed)
    } catch (error) {
      refreshDiagnostics({
        scope: 'system',
        action: 'shell-collapsed',
        detail: getErrorMessage(error, 'Nie udało się zapisać układu paska bocznego.'),
        level: 'warning',
      })
    }
  }

  if (!user || !admin || loginTransitioning) {
    return (
      <>
        <LoginScreen
          provider={provider}
          onLogin={login}
          onGoogleLogin={googleLogin}
          transitioning={loginTransitioning}
        />
        {bootError ? <div className="floating-error">{bootError}</div> : null}
      </>
    )
  }

  const activeDraft = formDraftOverride?.type === activeType
    ? formDraftOverride
    : drafts[activeType] || createDraft(activeType)
  const visibleNavItems = availableNavItems(user, t)
  const effectiveView = visibleNavItems.some((item) => item.key === view) ? view : 'start'

  return (
    <Suspense fallback={lazyViewFallback}>
        <AppShell
          user={user}
          providerMode={provider.mode}
          view={effectiveView}
          navItems={visibleNavItems}
          setView={navigateToView}
          onViewIntent={preloadView}
          onLogout={logout}
          systemNotice={bootError}
          notifications={notifications}
          onNotificationSelect={selectNotification}
          onMarkNotificationRead={(id) => void markNotificationRead(id)}
          onMarkAllNotificationsRead={() => void markAllNotificationsRead()}
          collapsed={shellCollapsed}
          onCollapsedChange={(value) => void saveShellCollapsedPreference(value)}
        >
        {effectiveView === 'start' ? (
          isViewerRole(user.role) ? (
            <ViewerPortalView user={user} assessments={assessments} goals={admin.goals} />
          ) : (
            <StartView
              user={user}
              assessments={assessments}
              drafts={drafts}
              setView={navigateToView}
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
              navigateToView('form', false, { formType: type })
            }}
            onDraftChange={updateDraft}
            onSaveAssessment={saveAssessment}
          />
        ) : null}
        {effectiveView === 'team' ? <TeamView user={user} admin={admin} assessments={assessments} setView={navigateToView} openRegistry={openRegistry} onStartAssessmentForSpecialist={startAssessmentForSpecialist} /> : null}
        {effectiveView === 'registry' ? (
          <RegistryView
            assessments={assessments}
            user={user}
            intentPreset={registryIntent?.preset}
            intentToken={registryIntent?.token}
            focusAssessmentId={registryFocus?.assessmentId}
            focusToken={registryFocus?.token}
            onUpdate={updateAssessment}
            onBulkImport={bulkImportAssessments}
            loadComments={loadAssessmentComments}
            addComment={addAssessmentComment}
          />
        ) : null}
        {effectiveView === 'dashboard' ? (
          <DashboardView
            userRole={user.role}
            assessments={assessments}
          goals={admin.goals}
          prefs={dashboardPrefs}
          onPrefsChange={saveDashboardPreferences}
          setView={navigateToView}
          openRegistry={openRegistry}
        />
      ) : null}
        {effectiveView === 'reports' ? (
          <ReportsView assessments={assessments} setView={navigateToView} openRegistry={openRegistry} onStartAssessmentForSpecialist={startAssessmentForSpecialist} />
        ) : null}
        {effectiveView === 'admin' && canAdminRole(user.role) ? (
          <AdminView
            key={`${users.map((item) => item.id).join('|')}::${admin.specialists.map((item) => item.id).join('|')}::${admin.periods.map((item) => item.code).join('|')}`}
            user={user}
            providerMode={provider.mode}
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

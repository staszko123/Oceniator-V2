import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  ClipboardCheck,
  Database,
  Download,
  Edit3,
  Eye,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  MonitorCog,
  Moon,
  PanelRight,
  PhoneCall,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { ASSESSMENT_DEFS, SCORE_OPTIONS, TYPE_LABELS } from './domain/defs'
import { assessmentToDraft, calculateDraft, createDraft, draftHasContent, draftToAssessment, periodOf, ratingLabel, resizeDraft } from './domain/scoring'
import { buildDemoAdmin } from './data/seed'
import { createProvider } from './data/supabaseProvider'
import { uniqueSorted } from './features/analytics/filters'
import { SpecialistProfileModal } from './features/specialists/profile'
import { canEditAssessment as canEditAssessmentForUser } from './lib/security'
import type {
  AdminConfig,
  Assessment,
  AssessmentDraft,
  AssessmentStatus,
  AssessmentType,
  DataProvider,
  ManagedUser,
  ScoreValue,
  UserProfile,
} from './domain/types'
import { useTheme } from './lib/theme'
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

const ReportsView = lazy(() => import('./features/reports/ReportsView'))
const AdminView = lazy(() => import('./features/admin/AdminView'))
const DashboardView = lazy(() => import('./features/dashboard/DashboardView'))
const lazyViewFallback = (
  <main className="screen">
    <div className="empty-state">Ladowanie widoku...</div>
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

type DraftAssistantResult = {
  status: 'ok' | 'warning'
  title: string
  summary: string
  warnings: string[]
  suggestions: string[]
}

function cleanSectionLabel(label: string): string {
  return label.replace(/^[IVX]+\.\s*/, '').trim()
}

function reviewDraftQuality(draft: AssessmentDraft): DraftAssistantResult {
  const def = ASSESSMENT_DEFS[draft.type]
  const warnings: string[] = []
  const suggestions: string[] = []
  const filledIds = draft.contactIds.filter((item) => item.trim())
  const noteCount = def.sections.reduce((total, section) => (
    total + (draft.notes[section.key] || []).filter((item) => item.trim()).length
  ), 0)
  const lowScores = def.sections.reduce((total, section) => (
    total + section.criteria.reduce((sectionTotal, _criterion, criterionIndex) => (
      sectionTotal + (draft.scores[section.key]?.[criterionIndex] || []).filter((value) => value === 0 || value === 0.5).length
    ), 0)
  ), 0)
  const hasGold = draft.gold.some((value) => Number(value) > 0)
  const finalScore = calculateDraft(draft).avgFinal

  if (!draft.specialist.trim()) warnings.push('Brakuje wybranego specjalisty.')
  if (!draft.date) warnings.push('Brakuje daty oceny.')
  if (!filledIds.length) warnings.push('Uzupelnij przynajmniej jeden identyfikator kontaktu.')
  if (filledIds.length && filledIds.length < draft.contactCount) {
    suggestions.push('Nie wszystkie pola kontaktow sa uzupelnione. Sprawdz, czy liczba kontaktow zgadza sie z karta.')
  }
  if (lowScores > 0 && noteCount === 0 && !draft.summary.trim()) {
    warnings.push('W karcie sa obnizone oceny, ale brakuje komentarzy sekcyjnych lub podsumowania.')
  }
  if (hasGold && !draft.goldDescription.trim()) {
    warnings.push('Dodano zlote punkty bez opisu sytuacji.')
  }
  if (finalScore >= 92 && !draft.summary.trim()) {
    suggestions.push('Przy bardzo dobrym wyniku warto dodac krotkie podsumowanie, zeby karta byla czytelna w ewidencji.')
  }

  return {
    status: warnings.length ? 'warning' : 'ok',
    title: 'Kontrola jakosci karty',
    summary: warnings.length
      ? `Wykryto ${warnings.length} ryzyk przed zapisem.`
      : 'Karta nie ma widocznych ryzyk przed zapisem.',
    warnings,
    suggestions,
  }
}

function buildDraftSummary(draft: AssessmentDraft): string {
  const def = ASSESSMENT_DEFS[draft.type]
  const calculated = calculateDraft(draft)
  const parts = def.sections.map((section) => {
    const score = calculated.secAvg[section.key] || 0
    const notes = (draft.notes[section.key] || []).filter((item) => item.trim()).join(' ')
    const intro = score >= 92
      ? `${cleanSectionLabel(section.label)} jest na wysokim poziomie.`
      : score >= 82
        ? `${cleanSectionLabel(section.label)} jest na dobrym poziomie, ale widac miejsce na doszlifowanie.`
        : `${cleanSectionLabel(section.label)} wymaga poprawy i doprecyzowania dalszych dzialan.`
    return `${intro} Wynik sekcji: ${score}%.${notes ? ` Uwagi: ${notes}` : ''}`
  })
  parts.push(`Wynik koncowy wynosi ${calculated.avgFinal}%. Ocena: ${ratingLabel(calculated.rating)}.`)
  return parts.join('\n\n')
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

async function exportExcel(rows: Assessment[]) {
  const { utils, writeFile } = await import('xlsx')
  const header = ['Specjalista', 'Stanowisko', 'Dzial', 'Typ', 'Okres', 'Data', 'Oceniajacy', 'Wynik', 'Ocena', 'Status']
  const tableRows = rows.map((item) => ({
    Specjalista: item.spec,
    Stanowisko: item.stand,
    Dzial: item.dzial,
    Typ: TYPE_LABELS[item.type],
    Okres: item.period,
    Data: item.data,
    Oceniajacy: item.oce,
    Wynik: item.avgFinal,
    Ocena: ratingLabel(item.rating),
    Status: statusLabels[item.status],
  }))
  const worksheet = utils.json_to_sheet(tableRows, { header })
  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
  ]
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, 'Ewidencja')
  writeFile(workbook, 'oceniator-ewidencja.xlsx')
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
  const { theme, toggleTheme } = useTheme()

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
            <small>Quality Operations SaaS</small>
          </div>
        </div>
        <h1>Centrum jakosci, ktore prowadzi caly proces oceny.</h1>
        <p>
          Formularze, ewidencja, raporty i administracja w jednym neutralnym,
          produkcyjnym portalu z szybkim trybem demo i gotowoscia pod Supabase.
        </p>
        <div className="login-proof">
          <div><ShieldCheck size={18} /> Role i zakresy</div>
          <div><Database size={18} /> Supabase lub lokalnie</div>
          <div><PanelRight size={18} /> Operacyjny pulpit</div>
        </div>
      </section>
      <section className="login-card">
        <div className="section-title">
          <span>{provider.mode === 'supabase' ? 'Logowanie Supabase' : 'Tryb lokalny'}</span>
          <button className="theme-toggle" type="button" onClick={toggleTheme} title="Przelacz motyw">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === 'dark' ? 'Jasny' : 'Ciemny'}</span>
          </button>
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
            <small>Quality OS</small>
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
            <button className="topbar-theme" type="button" onClick={toggleTheme} title="Przelacz motyw">
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
        <h1>Aplikacja wymaga wiekszego ekranu</h1>
        <p>Nowy Oceniator jest projektowany tylko pod desktop. Uzyj szerokosci minimum 1280 px.</p>
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
        <div className="metric-panel"><span>W weryfikacji</span><strong>{review}</strong><small>wymagaja decyzji</small></div>
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
                    <Trash2 size={15} /> Wyczysc
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-state">Brak zapisanych szkicow. Formularz zapisuje postep lokalnie przy kazdej zmianie.</div>}
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
            <thead><tr><th>Specjalista</th><th>Stanowisko</th><th>Dzial</th><th>Karty</th><th>Srednia</th><th>Ostatnia karta</th><th>Profil</th></tr></thead>
            <tbody>
              {specialistRows.map((item) => (
                <tr key={item.specialist.id}>
                  <td><strong>{item.specialist.name}</strong><small>{item.specialist.leader}</small></td>
                  <td>{item.specialist.position}</td>
                  <td>{item.specialist.department}</td>
                  <td>{item.count}</td>
                  <td>{item.count ? <span className={scoreClass(item.avg)}>{item.avg}%</span> : '-'}</td>
                  <td>{item.last ? `${item.last.data} · ${TYPE_LABELS[item.last.type]}` : 'Brak kart'}</td>
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

function EvaluationView({
  user,
  admin,
  draft,
  onSelectType,
  onDraftChange,
  onSaveAssessment,
}: {
  user: UserProfile
  admin: AdminConfig
  draft: AssessmentDraft
  onSelectType: (type: AssessmentType) => void
  onDraftChange: (draft: AssessmentDraft) => void
  onSaveAssessment: (draft: AssessmentDraft) => Promise<void>
}) {
  const [notice, setNotice] = useState('')
  const [assistantResult, setAssistantResult] = useState<DraftAssistantResult | null>(null)
  const def = ASSESSMENT_DEFS[draft.type]
  const calculated = useMemo(() => calculateDraft(draft), [draft])
  const specialists = useMemo(() => {
    if (user.role === 'admin' || user.role === 'director') return admin.specialists.filter((item) => item.active)
    return admin.specialists.filter((item) => item.active && item.leader === user.leaderScope)
  }, [admin.specialists, user])
  const draftSaveState = draft.savedAt
    ? `Szkic lokalny zapisany o ${new Date(draft.savedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
    : 'Zmiany sa zapisywane lokalnie po kazdej edycji.'

  function update(next: AssessmentDraft) {
    if (notice) setNotice('')
    if (assistantResult) setAssistantResult(null)
    onDraftChange(next)
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
      assessor: draft.assessor || user.fullName || user.email,
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

  function runDraftGuard() {
    setAssistantResult(reviewDraftQuality(draft))
  }

  function generateSummary() {
    const summary = buildDraftSummary(draft)
    update({ ...draft, summary })
    setAssistantResult({
      status: 'ok',
      title: 'Generator podsumowania',
      summary: 'Wygenerowano robocze podsumowanie na podstawie sekcji i wynikow.',
      warnings: [],
      suggestions: ['Przejrzyj tekst przed zapisem i dopasuj go do realnego feedbacku dla specjalisty.'],
    })
  }

  async function submit() {
    if (!draft.specialist.trim()) {
      setNotice('Wybierz specjaliste przed zapisem.')
      return
    }
    if (!draft.contactIds.some(Boolean)) {
      setNotice('Uzupelnij co najmniej jeden identyfikator kontaktu.')
      return
    }
    try {
      await onSaveAssessment({
        ...draft,
        assessor: draft.assessor || user.fullName || user.email,
      })
      setNotice('Karta dodana do ewidencji.')
    } catch (error) {
      setNotice(readableError(error, 'Nie udalo sie zapisac karty.'))
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
                if (item !== draft.type) onSelectType(item)
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
          <div className="section-title"><span>Akcje</span><small>{notice || draftSaveState}</small></div>
          <button className="primary-btn wide" onClick={submit} disabled={!canCreate(user)} type="button"><Save size={16} /> Dodaj karte</button>
          <button className="ghost-btn wide" onClick={() => update(createDraft(draft.type))} type="button"><Trash2 size={16} /> Wyczysc szkic</button>
        </section>
        <section className="rail-card assistant-card">
          <div className="section-title"><span>Asystent oceny</span><small>inspiracja z legacy, przebudowana pod v2</small></div>
          <div className="assistant-actions">
            <button className="ghost-btn wide" type="button" onClick={runDraftGuard}><ShieldCheck size={16} /> Sprawdz karte</button>
            <button className="ghost-btn wide" type="button" onClick={generateSummary}><FileText size={16} /> Wygeneruj podsumowanie</button>
          </div>
          {assistantResult ? (
            <div className={`assistant-result ${assistantResult.status}`}>
              <strong>{assistantResult.title}</strong>
              <p>{assistantResult.summary}</p>
              {assistantResult.warnings.length ? (
                <div>
                  <span>Ryzyka</span>
                  <ul>
                    {assistantResult.warnings.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}
              {assistantResult.suggestions.length ? (
                <div>
                  <span>Sugestie</span>
                  <ul>
                    {assistantResult.suggestions.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : <p className="hint-text">Uzyj kontroli jakosci przed zapisem albo wygeneruj pierwsza wersje komentarza koncowego.</p>}
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
      setNotice(readableError(error, 'Nie udalo sie zmienic statusu.'))
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
              {item.spec}: {statusLabels[item.status]} →
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

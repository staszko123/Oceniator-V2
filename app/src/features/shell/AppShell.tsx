import { useEffect, useState } from 'react'
import { Database, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun, UserRound } from 'lucide-react'
import type { DataProvider, UserProfile } from '../../domain/types'
import { useTheme } from '../../lib/theme'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

const shellStateKey = 'oc_v2_shell_sidebar_collapsed'

const roleLabels: Record<UserProfile['role'], string> = {
  admin: 'Administrator',
  director: 'Dyrektor',
  leader: 'Lider',
  assessor: 'Oceniajacy',
  viewer: 'Specjalista',
}

const providerLabels: Record<DataProvider['mode'], string> = {
  supabase: 'Supabase',
  local: 'Demo lokalne',
}

const viewMeta: Record<ViewKey, { eyebrow: string; description: string }> = {
  start: {
    eyebrow: 'Portal / Start',
    description: 'Szybki przeglad zadan, szkicow i najwazniejszych kart do dalszej pracy.',
  },
  form: {
    eyebrow: 'Portal / Ocena',
    description: 'Tworzenie i uzupelnianie kart oceny z widocznym wynikiem i stanem szkicu.',
  },
  team: {
    eyebrow: 'Portal / Zespol',
    description: 'Zakres zespolu, wyniki specjalistow i kontekst do dalszych decyzji lidera.',
  },
  registry: {
    eyebrow: 'Portal / Ewidencja',
    description: 'Tabela operacyjna do filtrowania, podgladu, edycji i domykania statusow kart.',
  },
  dashboard: {
    eyebrow: 'Portal / Analityka',
    description: 'Wskazniki, trendy i sygnaly ryzyka do codziennego zarzadzania jakoscia.',
  },
  reports: {
    eyebrow: 'Portal / Raporty',
    description: 'Eksport i zestawienia przekrojowe do komunikacji z liderami i managementem.',
  },
  admin: {
    eyebrow: 'Portal / Administracja',
    description: 'Zarzadzanie slownikami, okresami, specjalistami i dostepami uzytkownikow.',
  },
}

function resolveActiveMeta(view: ViewKey, role: UserProfile['role']): { eyebrow: string; description: string } {
  const baseMeta = viewMeta[view]
  if (view === 'start' && role === 'viewer') {
    return { eyebrow: 'Portal / Specjalista', description: 'Osobiste centrum wynikow, trendow i priorytetow jakosci.' }
  }
  if (view === 'registry' && role === 'viewer') {
    return { eyebrow: 'Portal / Specjalista', description: 'Ewidencja Twoich ocen zatwierdzonych przez lidera.' }
  }
  return baseMeta
}

export default function AppShell({
  user,
  providerMode,
  view,
  navItems,
  setView,
  onViewIntent,
  children,
  onLogout,
  systemNotice,
}: {
  user: UserProfile
  providerMode: DataProvider['mode']
  view: ViewKey
  navItems: Array<{ key: ViewKey; label: string; icon: React.ComponentType<{ size?: number }> }>
  setView: (view: ViewKey) => void
  onViewIntent?: (view: ViewKey) => void
  children: React.ReactNode
  onLogout: () => void
  systemNotice?: string
}) {
  const activeTitle = navItems.find((item) => item.key === view)?.label || 'Oceniator'
  const activeMeta = resolveActiveMeta(view, user.role)
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(shellStateKey) === 'true'
  })

  useEffect(() => {
    window.localStorage.setItem(shellStateKey, String(collapsed))
  }, [collapsed])

  return (
    <div className={collapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>
        <div className="sidebar-head">
          <div className="brand-block">
            <span className="logo-box" />
            <div className="brand-copy">
              <strong>Oceniator</strong>
              <small>System jakosci</small>
            </div>
          </div>
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? 'Rozwin pasek boczny' : 'Zwin pasek boczny'}
            aria-label={collapsed ? 'Rozwin pasek boczny' : 'Zwin pasek boczny'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                className={view === item.key ? 'active' : ''}
                onClick={() => setView(item.key)}
                onMouseEnter={() => onViewIntent?.(item.key)}
                onFocus={() => onViewIntent?.(item.key)}
                title={collapsed ? item.label : undefined}
                type="button"
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="mode-chip">
            <Database size={14} />
            <span>{providerLabels[providerMode]}</span>
          </div>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div className="topbar-copy">
            <div className="topbar-eyebrow">
              <span>{activeMeta.eyebrow}</span>
            </div>
            <h2>{activeTitle}</h2>
            <p>{activeMeta.description}</p>
          </div>
          <div className="user-pill">
            <div className="topbar-context">
              <span className="topbar-chip">
                <Database size={13} />
                {providerLabels[providerMode]}
              </span>
              <span className="topbar-chip neutral">{roleLabels[user.role]}</span>
            </div>
            <div className="topbar-user">
              <UserRound size={15} />
              <div>
                <strong>{user.fullName}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <button className="topbar-theme" type="button" onClick={toggleTheme} title="Przelacz motyw">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button type="button" onClick={onLogout}>
              <LogOut size={15} />
              Wyloguj
            </button>
          </div>
        </header>
        {systemNotice ? <div className="system-notice">{systemNotice}</div> : null}
        {children}
      </section>
      <div className="desktop-guard">
        <div className="desktop-guard-card">
          <strong>Aplikacja wymaga wiekszego ekranu</strong>
          <p>Oceniator jest projektowany pod prace desktopowa. Uzyj szerokosci minimum 960 px.</p>
        </div>
      </div>
    </div>
  )
}

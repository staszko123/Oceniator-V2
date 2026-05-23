import { Database, LogOut, Moon, Sun, UserRound } from 'lucide-react'
import type { DataProvider, UserProfile } from '../../domain/types'
import { useTheme } from '../../lib/theme'

type ViewKey = 'start' | 'form' | 'team' | 'registry' | 'dashboard' | 'reports' | 'admin'

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
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="logo-box" />
          <div>
            <strong>Oceniator</strong>
            <small>System jakości</small>
          </div>
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
            <button className="topbar-theme" type="button" onClick={toggleTheme} title="Przełącz motyw">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button type="button" onClick={onLogout}><LogOut size={15} /> Wyloguj</button>
          </div>
        </header>
        {systemNotice ? <div className="system-notice">{systemNotice}</div> : null}
        {children}
      </section>
      <div className="desktop-guard">
        <div>
          <strong>Aplikacja wymaga większego ekranu</strong>
          <p>Oceniator jest projektowany pod desktop. Użyj szerokości minimum 1280 px.</p>
        </div>
      </div>
    </div>
  )
}

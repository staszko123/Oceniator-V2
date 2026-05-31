import { useEffect, useRef, useState } from 'react'
import type { ComponentType, ReactNode, RefObject } from 'react'
import { Bell, Database, Globe, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun, UserRound } from 'lucide-react'
import type { DataProvider, UserProfile } from '../../domain/types'
import { notificationTypeConfig } from '../../config/status'
import { PROVIDER_LABELS, ROLE_LABELS } from '../../lib/display'
import { useTheme } from '../../lib/theme'
import { routeConfig, type ViewKey } from '../../config/navigation'
import { useLanguage } from '../../i18n/LanguageContext'
import type { Notification } from '../../types/notification'
import { isViewerRole } from '../../domain/access'

function resolveActiveMeta(view: ViewKey, role: UserProfile['role'], t: (key: string, fallback?: string) => string) {
  const baseMeta = routeConfig[view]
  if ((view === 'start' || view === 'registry') && isViewerRole(role)) {
    return {
      eyebrow: t(baseMeta.viewerEyebrowKey || baseMeta.eyebrowKey),
      description: t(baseMeta.viewerDescriptionKey || baseMeta.descriptionKey),
    }
  }
  return {
    eyebrow: t(baseMeta.eyebrowKey),
    description: t(baseMeta.descriptionKey),
  }
}

function NotificationList({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onSelect,
  popoverRef,
}: {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onSelect?: (notification: Notification) => void
  popoverRef?: RefObject<HTMLDivElement | null>
}) {
  const { t, language } = useLanguage()

  return (
    <div className="notification-popover" id="notifications-popover" ref={popoverRef}>
      <div className="notification-popover-head">
        <strong>{t('notifications.title')}</strong>
        <button type="button" className="ghost-btn" onClick={onMarkAllRead}>
          {t('action.markAllAsRead')}
        </button>
      </div>
      <div className="notification-popover-list">
        {notifications.length ? notifications.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.read ? 'notification-item read' : 'notification-item'}
            onClick={() => {
              onMarkRead(item.id)
              onSelect?.(item)
            }}
          >
            <div className="notification-item-head">
              <strong>{item.title}</strong>
              <span className={`notification-chip tone-${notificationTypeConfig[item.type].tone}`}>
                {t(notificationTypeConfig[item.type].labelKey)}
              </span>
            </div>
            <span>{item.message}</span>
            <div className="notification-item-foot">
              <small>{new Date(item.createdAt).toLocaleString(language === 'pl' ? 'pl-PL' : 'en-US')}</small>
              {!item.read ? <span className="notification-unread-dot" aria-hidden="true" /> : null}
            </div>
          </button>
        )) : <div className="notification-empty">{t('notifications.empty')}</div>}
      </div>
    </div>
  )
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
  onNotificationSelect,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  collapsed,
  onCollapsedChange,
}: {
  user: UserProfile
  providerMode: DataProvider['mode']
  view: ViewKey
  navItems: Array<{ key: ViewKey; label: string; icon: ComponentType<{ size?: number }> }>
  setView: (view: ViewKey) => void
  onViewIntent?: (view: ViewKey) => void
  children: ReactNode
  onLogout: () => void
  systemNotice?: string
  onNotificationSelect?: (notification: Notification) => void
  notifications?: Notification[]
  onMarkNotificationRead?: (id: string) => void
  onMarkAllNotificationsRead?: () => void
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}) {
  const activeTitle = navItems.find((item) => item.key === view)?.label || 'Oceniator'
  const { t, language, setLanguage } = useLanguage()
  const activeMeta = resolveActiveMeta(view, user.role, t)
  const { theme, toggleTheme } = useTheme()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsPopoverRef = useRef<HTMLDivElement | null>(null)
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!notificationsOpen) return undefined

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (notificationsPopoverRef.current?.contains(target)) return
      if (notificationsButtonRef.current?.contains(target)) return
      setNotificationsOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setNotificationsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [notificationsOpen])

  function selectNotification(notification: Notification) {
    setNotificationsOpen(false)
    onNotificationSelect?.(notification)
  }

  const unreadCount = notifications.filter((item) => !item.read).length

  return (
    <div className={collapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>
        <div className="sidebar-head">
          <div className="brand-block">
            <img className="brand-logo" src="/oceniator-logo-simple.png" alt="" aria-hidden="true" />
            <div className="brand-copy">
              <strong>Oceniator</strong>
              <small>{t('app.brand.subtitle', 'System jakosci')}</small>
            </div>
          </div>
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            title={collapsed ? t('action.expandSidebar') : t('action.collapseSidebar')}
            aria-label={collapsed ? t('action.expandSidebar') : t('action.collapseSidebar')}
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
            <span>{PROVIDER_LABELS[providerMode]}</span>
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
                {PROVIDER_LABELS[providerMode]}
              </span>
              <span className="topbar-chip neutral">{ROLE_LABELS[user.role]}</span>
            </div>
            <div className="topbar-user">
              <UserRound size={15} />
              <div>
                <strong>{user.fullName}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <button
              ref={notificationsButtonRef}
              className="topbar-icon-btn"
              type="button"
              onClick={() => setNotificationsOpen((value) => !value)}
              title={t('notifications.open')}
              aria-label={t('notifications.open')}
              aria-expanded={notificationsOpen}
              aria-controls="notifications-popover"
            >
              <Bell size={15} />
              {unreadCount > 0 ? <span className="topbar-badge">{unreadCount}</span> : null}
            </button>
            <button className="topbar-icon-btn" type="button" onClick={() => setLanguage(language === 'pl' ? 'en' : 'pl')} title={t('action.language')}>
              <Globe size={15} />
              <span>{t(`language.${language}`)}</span>
            </button>
            <button className="topbar-theme" type="button" onClick={toggleTheme} title={t('action.theme')}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button type="button" onClick={onLogout} title={t('action.logout')}>
              <LogOut size={15} />
              {t('action.logout')}
            </button>
          </div>
        </header>
        {notificationsOpen ? (
          <NotificationList
            notifications={notifications}
            onMarkRead={onMarkNotificationRead || (() => {})}
            onMarkAllRead={onMarkAllNotificationsRead || (() => {})}
            onSelect={selectNotification}
            popoverRef={notificationsPopoverRef}
          />
        ) : null}
        {systemNotice ? <div className="system-notice">{systemNotice}</div> : null}
        {children}
      </section>
      <div className="desktop-guard">
        <div className="desktop-guard-card">
          <strong>{t('layout.desktopOnlyTitle')}</strong>
          <p>{t('layout.desktopOnlyDescription')}</p>
        </div>
      </div>
    </div>
  )
}

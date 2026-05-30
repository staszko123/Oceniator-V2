import { MoreVertical } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { hasPermission } from '../../config/permissions'
import type { Role } from '../../domain/types'
import type { TableAction } from '../../types/table'
import { useLanguage } from '../../i18n/LanguageContext'

function resolveDisabled<T>(action: TableAction<T>, row: T): boolean | string {
  if (typeof action.disabled === 'function') return action.disabled(row)
  return action.disabled || false
}

function resolveHidden<T>(action: TableAction<T>, row: T): boolean {
  if (typeof action.hidden === 'function') return action.hidden(row)
  return Boolean(action.hidden)
}

function resolveLabel<T>(action: TableAction<T>, t: (key: string, fallback?: string) => string): string {
  return action.label || (action.labelKey ? t(action.labelKey) : action.key)
}

export function ActionMenuList<T>({
  row,
  actions,
  role,
  onClose,
  onSelect,
}: {
  row: T
  actions: Array<TableAction<T>>
  role: Role
  onClose: () => void
  onSelect?: (action: TableAction<T>, row: T) => void
}) {
  const { t } = useLanguage()

  const visibleActions = useMemo(() => actions.filter((action) => {
    if (action.permission && !hasPermission(role, action.permission)) return false
    return !resolveHidden(action, row)
  }), [actions, role, row])

  return (
    <div className="action-menu-list" role="menu">
      {visibleActions.length ? visibleActions.map((action) => {
        const disabled = resolveDisabled(action, row)
        const label = resolveLabel(action, t)
        const reason = typeof disabled === 'string' ? t(disabled, disabled) : ''
        return (
          <Fragment key={action.key}>
            {action.separatorBefore ? <div className="action-menu-separator" aria-hidden="true" /> : null}
            <button
              className={action.danger ? 'danger' : ''}
              type="button"
              disabled={Boolean(disabled)}
              title={reason || label}
              aria-disabled={Boolean(disabled)}
              onClick={() => {
                if (disabled) return
                onSelect?.(action, row)
                action.onSelect(row)
                onClose()
              }}
            >
              {action.icon}
              <span>{label}</span>
            </button>
          </Fragment>
        )
      }) : <div className="action-menu-empty">{t('table.noData')}</div>}
    </div>
  )
}

export function ActionMenu<T>({
  row,
  actions,
  role,
}: {
  row: T
  actions: Array<TableAction<T>>
  role: Role
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const closeMenu = useCallback(() => {
    setOpen(false)
    setPosition(null)
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (wrapRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      closeMenu()
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [closeMenu])

  return (
    <div className="action-menu" ref={wrapRef}>
      <button
        className="action-menu-trigger"
        type="button"
        aria-label={t('action.openMenu')}
        aria-expanded={open}
        onClick={(event) => {
          const nextOpen = !open
          if (nextOpen) {
            const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect()
            setPosition({
              top: Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - 320)),
              left: Math.max(16, Math.min(rect.right - 248, window.innerWidth - 264)),
            })
          } else {
            setPosition(null)
          }
          setOpen(nextOpen)
        }}
      >
        <MoreVertical size={15} />
      </button>
      {open && typeof document !== 'undefined' ? createPortal(
        <div className="action-menu-popover" ref={popoverRef} style={position || undefined}>
          <ActionMenuList row={row} actions={actions} role={role} onClose={closeMenu} />
        </div>,
        document.body,
      ) : null}
    </div>
  )
}

export function ActionMenuButton({
  onClick,
  label = 'Open',
}: {
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void
  label?: string
}) {
  return (
    <button className="action-menu-trigger" type="button" aria-label={label} onClick={onClick}>
      <MoreVertical size={15} />
    </button>
  )
}

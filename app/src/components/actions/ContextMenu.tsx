import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Role } from '../../domain/types'
import type { TableAction } from '../../types/table'
import { ActionMenuList } from './ActionMenu'
import type { ContextMenuState } from '../../hooks/useContextMenu'

export function ContextMenu<T>({
  state,
  actions,
  role,
  onClose,
}: {
  state: ContextMenuState<T> | null
  actions: Array<TableAction<T>>
  role: Role
  onClose: () => void
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    if (!state) return undefined
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, state])

  const style = useMemo(() => {
    if (!state) return undefined
    return {
      left: Math.min(state.x, window.innerWidth - 280),
      top: Math.min(state.y, window.innerHeight - 320),
    }
  }, [state])

  if (!state) return null

  return createPortal(
    <div className="context-menu-backdrop" role="presentation" onClick={onClose}>
      <div className="context-menu" role="menu" style={style} onClick={(event) => event.stopPropagation()}>
        <ActionMenuList row={state.row} actions={actions} role={role} onClose={onClose} />
      </div>
    </div>,
    document.body,
  )
}

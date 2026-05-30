import { useCallback, useState } from 'react'
import type { MouseEvent } from 'react'

export interface ContextMenuState<T> {
  x: number
  y: number
  row: T
}

export function useContextMenu<T>() {
  const [state, setState] = useState<ContextMenuState<T> | null>(null)

  const open = useCallback((event: MouseEvent<HTMLElement>, row: T) => {
    event.preventDefault()
    setState({
      x: event.clientX,
      y: event.clientY,
      row,
    })
  }, [])

  const close = useCallback(() => {
    setState(null)
  }, [])

  return {
    state,
    open,
    close,
    isOpen: Boolean(state),
  }
}


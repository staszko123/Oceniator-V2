import type { ReactNode } from 'react'
import type { Permission } from './permissions'

export type TableSortDirection = 'asc' | 'desc'

export interface TableSortState {
  key: string
  direction: TableSortDirection
}

export interface TableColumn<T> {
  key: string
  label?: string
  labelKey?: string
  sortable?: boolean
  filterable?: boolean
  hidden?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  className?: string
  accessor?: (row: T) => string | number | boolean | Date | null | undefined
  render?: (row: T) => ReactNode
  exportValue?: (row: T) => string | number | boolean | Date | null | undefined
}

export interface TableAction<T> {
  key: string
  label?: string
  labelKey?: string
  icon?: ReactNode
  permission?: Permission
  danger?: boolean
  separatorBefore?: boolean
  disabled?: boolean | ((row: T) => boolean | string)
  hidden?: boolean | ((row: T) => boolean)
  onSelect: (row: T) => void
}


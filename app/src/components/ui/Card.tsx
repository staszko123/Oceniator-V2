/** Komponenty UI - Card */

import { clsx } from '../../lib/format'
import type { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'glass' | 'interactive'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  onClick,
}: CardProps) {
  const variants = {
    default: 'bg-surface-primary border-border-subtle shadow-md',
    elevated: 'bg-surface-primary border-border-subtle shadow-lg',
    glass: 'glass',
    interactive: 'bg-surface-primary border-border-subtle shadow-md hover:shadow-lg transition-all cursor-pointer',
  }
  
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }
  
  return (
    <div
      className={clsx(
        'rounded-lg border transition-all',
        variants[variant],
        paddings[padding],
        onClick && 'hover:scale-[1.01] active:scale-[0.99]',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 mb-4', className)}>
      <div>
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

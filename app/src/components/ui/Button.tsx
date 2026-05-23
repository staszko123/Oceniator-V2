/** Komponenty UI - Button */

import { clsx } from '../../lib/format'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  icon?: ReactNode
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:opacity-90 focus:ring-brand-primary shadow-md hover:shadow-lg',
    secondary: 'bg-surface-primary border border-border-default text-text-primary hover:bg-bg-secondary focus:ring-brand-primary',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-secondary hover:text-text-primary focus:ring-border-strong',
    danger: 'bg-error-bg text-error-text border border-error-border hover:bg-error-bg/80 focus:ring-error-border',
    success: 'bg-success-bg text-success-text border border-success-border hover:bg-success-bg/80 focus:ring-success-border',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  
  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        loading ? 'animate-pulse' : '',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {icon && !loading && <span className="flex-shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  )
}

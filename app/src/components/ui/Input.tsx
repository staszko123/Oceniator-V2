/** Komponenty UI - Input */

import { clsx } from '../../lib/format'
import type { InputHTMLAttributes, ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
  fullWidth?: boolean
}

export function Input({
  label,
  error,
  icon,
  fullWidth = true,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  
  return (
    <div className={clsx('form-field', fullWidth ? 'w-full' : '', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wide text-text-muted mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={clsx(
            'w-full px-4 py-2.5 text-sm rounded-md border transition-all outline-none',
            'bg-surface-primary text-text-primary placeholder-text-muted',
            'border-border-default focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
            error && 'border-error-border focus:border-error-border focus:ring-error-border/20',
            icon ? 'pl-10' : ''
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-error-text font-semibold">{error}</p>
      )}
    </div>
  )
}

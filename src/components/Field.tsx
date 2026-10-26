import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

interface FieldFrameProps {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

function FieldFrame({ id, label, hint, error, children }: FieldFrameProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const CONTROL_CLASS =
  'min-h-11 w-full rounded-lg border bg-surface px-3 text-base text-fg placeholder:text-muted'

function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`
  return hint ? `${id}-hint` : undefined
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, className = '', ...rest }: InputProps) {
  const id = useId()
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL_CLASS} ${error ? 'border-danger' : 'border-line'} ${className}`}
        {...rest}
      />
    </FieldFrame>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string
}

export function Select({ label, hint, error, className = '', children, ...rest }: SelectProps) {
  const id = useId()
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL_CLASS} ${error ? 'border-danger' : 'border-line'} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldFrame>
  )
}

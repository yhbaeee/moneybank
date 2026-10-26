import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-90',
  secondary: 'border border-line bg-surface text-fg hover:bg-primary-soft',
  danger: 'bg-danger text-danger-fg hover:opacity-90',
  ghost: 'text-fg hover:bg-primary-soft',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    />
  )
}

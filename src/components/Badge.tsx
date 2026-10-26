import type { HTMLAttributes } from 'react'

type Tone = 'neutral' | 'income' | 'expense'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-primary-soft text-fg',
  income: 'bg-primary-soft text-income',
  expense: 'bg-primary-soft text-expense',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ tone = 'neutral', className = '', ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]} ${className}`}
      {...rest}
    />
  )
}

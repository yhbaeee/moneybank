import { createContext, useContext } from 'react'

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast는 ToastProvider 안에서 사용해야 합니다.')
  return ctx
}

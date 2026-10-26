import { createContext, useContext } from 'react'

export type Theme = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'ledger.theme'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme은 ThemeProvider 안에서 사용해야 합니다.')
  return ctx
}

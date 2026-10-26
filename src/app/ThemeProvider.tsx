import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { THEME_STORAGE_KEY, ThemeContext, isTheme, type Theme, type ThemeContextValue } from './themeContext'

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function prefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && prefersDark())
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    if (theme !== 'system' || typeof matchMedia !== 'function') return
    const media = matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (next) => {
        setThemeState(next)
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next)
        } catch {
          // 저장 실패 시에도 현재 세션에서는 테마를 적용한다.
        }
      },
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

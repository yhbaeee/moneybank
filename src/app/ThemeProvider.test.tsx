import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { THEME_STORAGE_KEY, useTheme } from './themeContext'

function Probe() {
  const { theme, setTheme } = useTheme()
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>다크</button>
      <button onClick={() => setTheme('light')}>라이트</button>
    </>
  )
}

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('ThemeProvider', () => {
  it('저장된 값이 없으면 system으로 시작한다', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme')).toHaveTextContent('system')
  })

  it('다크 선택 시 html에 dark 클래스를 적용하고 저장한다', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await user.click(screen.getByRole('button', { name: '다크' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    await user.click(screen.getByRole('button', { name: '라이트' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('저장된 값이 올바르지 않으면 system으로 대체한다', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme')).toHaveTextContent('system')
  })
})

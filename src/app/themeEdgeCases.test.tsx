import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { useTheme } from './themeContext'

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

function renderProvider() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )
}

/** 변경 가능한 prefers-color-scheme 흉내 */
function stubColorScheme(initialDark: boolean) {
  const state = { dark: initialDark, listener: undefined as (() => void) | undefined }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return state.dark
      },
      addEventListener: (_: string, fn: () => void) => {
        state.listener = fn
      },
      removeEventListener: () => {
        state.listener = undefined
      },
    })),
  )
  return state
}

afterEach(() => {
  document.documentElement.classList.remove('dark')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ThemeProvider: 예외 상황', () => {
  it('저장소를 읽을 수 없어도 system으로 시작한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    renderProvider()
    expect(screen.getByTestId('theme')).toHaveTextContent('system')
  })

  it('저장에 실패해도 현재 화면에는 테마를 적용한다', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    renderProvider()
    await userEvent.click(screen.getByRole('button', { name: '다크' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('system일 때 OS 설정이 바뀌면 따라가고, 사라질 때 구독을 해제한다', () => {
    const scheme = stubColorScheme(false)
    const { unmount } = renderProvider()
    expect(document.documentElement).not.toHaveClass('dark')

    scheme.dark = true
    scheme.listener?.()
    expect(document.documentElement).toHaveClass('dark')

    unmount()
    expect(scheme.listener).toBeUndefined()
  })

  it('수동으로 라이트를 고르면 OS 설정 변화를 따르지 않는다', async () => {
    const scheme = stubColorScheme(true)
    renderProvider()
    expect(document.documentElement).toHaveClass('dark') // system + OS 다크

    await userEvent.click(screen.getByRole('button', { name: '라이트' }))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(scheme.listener).toBeUndefined()
  })
})

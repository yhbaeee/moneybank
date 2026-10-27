import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { THEME_STORAGE_KEY } from '../../app/themeContext'

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('설정 화면: 테마', () => {
  it('테마를 바꾸면 즉시 적용하고 저장하며, 데이터 저장소는 건드리지 않는다', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/settings')
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: '설정' })
    const dataBefore = localStorage.getItem('ledger.data')

    await user.selectOptions(screen.getByLabelText('테마'), '다크')
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    await user.selectOptions(screen.getByLabelText('테마'), '라이트')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('ledger.data')).toBe(dataBefore)
  })
})

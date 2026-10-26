import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('홈 화면과 주 메뉴를 표시한다', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: '홈' })).toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: '주 메뉴' }).length).toBeGreaterThan(0)
  })

  it('메뉴로 설정 화면에 이동할 수 있다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: '홈' })
    await user.click(screen.getAllByRole('link', { name: '설정' })[0])
    expect(screen.getByRole('heading', { level: 1, name: '설정' })).toBeInTheDocument()
  })
})

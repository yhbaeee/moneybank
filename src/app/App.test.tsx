import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'

// 테스트 사이에 주소가 이어지지 않도록 항상 홈에서 시작한다.
beforeEach(() => {
  window.history.pushState({}, '', '/')
})

describe('App 접근성', () => {
  it('건너뛰기 링크가 있고 누르면 본문으로 포커스가 이동한다', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/')
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: '홈' })
    await user.click(screen.getByRole('link', { name: '본문으로 건너뛰기' }))
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('처음 열 때는 포커스를 옮기지 않고 문서 제목만 설정한다', async () => {
    window.history.pushState({}, '', '/transactions')
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: '내역' })
    // 문서 제목은 effect에서 설정되므로 화면 렌더와 한 틱 어긋날 수 있다.
    await waitFor(() => expect(document.title).toBe('내역 · 가계부'))
    expect(document.body).toHaveFocus()
  })

  it('화면을 이동하면 문서 제목이 바뀌고 페이지 제목으로 포커스가 이동한다', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/')
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: '홈' })
    await user.click(screen.getAllByRole('link', { name: '설정' })[0])
    await waitFor(() => expect(document.title).toBe('설정 · 가계부'))
    expect(screen.getByRole('heading', { level: 1, name: '설정' })).toHaveFocus()
  })
})

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

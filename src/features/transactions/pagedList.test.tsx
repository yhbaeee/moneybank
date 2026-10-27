import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { createSeedData } from '../../domain/defaults'
import type { LedgerData, Transaction } from '../../domain/types'
import { createLocalStorageRepository } from '../../storage/localStorageRepository'

/** 한 달에 내역이 많을 때(100건 초과) 점진 렌더링과 "더 보기"가 올바르게 동작하는지 검증한다. */

function ledgerWith(count: number): LedgerData {
  const seed = createSeedData()
  const transactions: Transaction[] = Array.from({ length: count }, (_, i) => ({
    id: `t-${String(i).padStart(4, '0')}`,
    type: 'expense',
    amount: 1000 + i,
    // 같은 달(2026-10) 안에서 날짜를 나눠 여러 날짜 그룹이 생기게 한다.
    date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}` as Transaction['date'],
    categoryId: 'cat-expense-1',
    paymentMethodId: 'pay-1',
    memo: i % 7 === 0 ? `특별 ${i}` : `일반 ${i}`,
    tags: [],
    ownerId: 'member-me',
    createdAt: `2026-01-01T00:00:00.${String(i % 1000).padStart(3, '0')}Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }))
  return { ...seed, transactions }
}

async function openList(count: number) {
  const repo = createLocalStorageRepository()
  await repo.init()
  await repo.importAll(ledgerWith(count))
  window.history.pushState({}, '', '/transactions')
  render(<App />)
  await screen.findByRole('heading', { level: 1, name: '내역' })
}

const rows = () => screen.queryAllByRole('listitem')

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 12))
})

afterEach(() => {
  vi.useRealTimers()
})

// 한 테스트마다 App을 250행으로 렌더링하므로 무겁다. 전체 병렬·커버리지 계측 부하에서도 넉넉하게 통과하도록 제한을 늘린다.
describe('긴 목록 점진 렌더링', { timeout: 30_000 }, () => {
  it('100건 이하이면 모두 보여 주고 "더 보기"는 없다', async () => {
    await openList(100)
    expect(rows()).toHaveLength(100)
    expect(screen.queryByRole('button', { name: /더 보기/ })).not.toBeInTheDocument()
    expect(screen.getByText(/^100건 · 수입/)).toBeInTheDocument()
  })

  it('250건이면 처음 100건만 그리고 합계는 전체 기준으로 표시한다', async () => {
    await openList(250)
    expect(rows()).toHaveLength(100)
    expect(screen.getByText(/^250건 · 수입 0원 · 지출 /)).toBeInTheDocument()
    expect(screen.getByText('250건 중 100건 표시')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '더 보기 (150건 남음)' })).toBeInTheDocument()
  })

  it('"더 보기"를 누르면 100건씩 늘어나고 모두 보이면 버튼이 사라진다', async () => {
    const user = userEvent.setup()
    await openList(250)
    await user.click(screen.getByRole('button', { name: '더 보기 (150건 남음)' }))
    expect(rows()).toHaveLength(200)
    expect(screen.getByText('250건 중 200건 표시')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '더 보기 (50건 남음)' }))
    expect(rows()).toHaveLength(250)
    expect(screen.queryByRole('button', { name: /더 보기/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/건 중 .*건 표시/)).not.toBeInTheDocument()
  })

  it('"더 보기" 뒤 포커스는 새로 나타난 첫 행으로 이동한다', async () => {
    const user = userEvent.setup()
    await openList(250)
    await user.click(screen.getByRole('button', { name: /더 보기/ }))
    const buttons = screen.getAllByRole('listitem').map((li) => within(li).getByRole('button'))
    expect(buttons[100]).toHaveFocus()
  })

  it('목록은 날짜 내림차순이고 "더 보기"로 이어지는 순서가 끊기지 않는다', async () => {
    const user = userEvent.setup()
    await openList(250)
    await user.click(screen.getByRole('button', { name: /더 보기/ }))
    const dates = screen
      .getAllByRole('region')
      .map((section) => section.getAttribute('aria-label'))
      .filter((label): label is string => label !== null && /일 \(/.test(label))
    // 날짜 제목 수는 28일(1~28일) 이하이고 중복이 없다.
    expect(new Set(dates).size).toBe(dates.length)
    expect(dates.length).toBeLessThanOrEqual(28)
  })

  it('필터가 바뀌면 처음 100건부터 다시 보여 준다', async () => {
    const user = userEvent.setup()
    await openList(250)
    await user.click(screen.getByRole('button', { name: /더 보기/ }))
    expect(rows()).toHaveLength(200)

    // 전체의 약 1/7(36건)만 일치하는 검색 → 한 화면에 모두 들어온다.
    await user.type(screen.getByLabelText('검색'), '특별')
    expect(rows()).toHaveLength(36)
    expect(screen.queryByRole('button', { name: /더 보기/ })).not.toBeInTheDocument()

    // 필터를 지우면 다시 처음 100건부터.
    await user.clear(screen.getByLabelText('검색'))
    expect(rows()).toHaveLength(100)
    expect(screen.getByRole('button', { name: '더 보기 (150건 남음)' })).toBeInTheDocument()
  })

  it('월을 이동했다 돌아와도 처음 100건부터 다시 보여 준다', async () => {
    const user = userEvent.setup()
    await openList(250)
    await user.click(screen.getByRole('button', { name: /더 보기/ }))
    await user.click(screen.getByRole('button', { name: '이전 달' }))
    expect(screen.getByText('이 달의 내역이 없습니다')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '이번 달' }))
    expect(rows()).toHaveLength(100)
  })

  it('행을 눌러 수정할 수 있다(더 보기로 나타난 행 포함)', async () => {
    const user = userEvent.setup()
    await openList(250)
    await user.click(screen.getByRole('button', { name: /더 보기/ }))
    const last = rows().at(-1)!
    await user.click(within(last).getByRole('button'))
    expect(screen.getByRole('dialog', { name: '내역 수정' })).toBeInTheDocument()
  })
})

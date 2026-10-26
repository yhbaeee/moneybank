import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { createLocalStorageRepository } from '../../storage/localStorageRepository'
import { CategoryBreakdown } from './CategoryBreakdown'
import { SummaryCards } from './SummaryCards'

describe('SummaryCards', () => {
  it('수입·지출·잔액을 원 단위로 표시한다', () => {
    render(<SummaryCards summary={{ income: 3_000_000, expense: 25000, balance: 2_975_000, count: 4 }} />)
    expect(screen.getByRole('group', { name: '수입' })).toHaveTextContent('3,000,000원')
    expect(screen.getByRole('group', { name: '지출' })).toHaveTextContent('25,000원')
    expect(screen.getByRole('group', { name: '잔액' })).toHaveTextContent('2,975,000원')
  })

  it('잔액이 음수이면 - 부호와 지출 색으로 표시한다', () => {
    render(<SummaryCards summary={{ income: 0, expense: 5000, balance: -5000, count: 1 }} />)
    const balance = screen.getByRole('group', { name: '잔액' })
    expect(balance).toHaveTextContent('-5,000원')
    expect(within(balance).getByText('-5,000원')).toHaveClass('text-expense')
  })
})

describe('CategoryBreakdown', () => {
  it('카테고리별 금액과 비율을 표시한다', () => {
    render(
      <CategoryBreakdown
        shares={[
          { categoryId: 'a', name: '식비', color: '#4f46e5', amount: 20000, permille: 800 },
          { categoryId: 'b', name: '교통', color: '#0ea5e9', amount: 5000, permille: 200 },
        ]}
      />,
    )
    const items = within(screen.getByRole('list', { name: '카테고리별 지출' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('식비')
    expect(items[0]).toHaveTextContent('20,000원')
    expect(items[0]).toHaveTextContent('80.0%')
    expect(items[1]).toHaveTextContent('20.0%')
  })

  it('지출이 없으면 빈 상태를 표시한다', () => {
    render(<CategoryBreakdown shares={[]} />)
    expect(screen.getByText('이 달의 지출 내역이 없습니다')).toBeInTheDocument()
  })
})

describe('홈 화면 (저장소 연동)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('이번 달 내역만 집계해 요약과 카테고리 집계를 표시한다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 12))

    const repo = createLocalStorageRepository()
    await repo.init()
    const base = { paymentMethodId: 'pay-1', memo: '', tags: [] }
    await repo.transactions.create({ ...base, type: 'income', categoryId: 'cat-income-1', amount: 3_000_000, date: '2026-10-25' })
    await repo.transactions.create({ ...base, type: 'expense', categoryId: 'cat-expense-1', amount: 20000, date: '2026-10-27' })
    await repo.transactions.create({ ...base, type: 'expense', categoryId: 'cat-expense-2', amount: 5000, date: '2026-10-31' })
    await repo.transactions.create({ ...base, type: 'expense', categoryId: 'cat-expense-4', amount: 99999, date: '2026-09-30' })
    await repo.transactions.create({ ...base, type: 'expense', categoryId: 'cat-expense-4', amount: 88888, date: '2026-11-01' })

    window.history.pushState({}, '', '/')
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: '홈' })).toBeInTheDocument()
    expect(screen.getByText('2026년 10월')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '수입' })).toHaveTextContent('3,000,000원')
    expect(screen.getByRole('group', { name: '지출' })).toHaveTextContent('25,000원')
    expect(screen.getByRole('group', { name: '잔액' })).toHaveTextContent('2,975,000원')

    const items = within(screen.getByRole('list', { name: '카테고리별 지출' })).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('식비'),
      expect.stringContaining('교통'),
    ])
    expect(items[0]).toHaveTextContent('80.0%')
    expect(screen.queryByText('쇼핑')).not.toBeInTheDocument()
  })

  it('내역이 없으면 0원과 빈 상태를 표시한다', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(await screen.findByRole('group', { name: '잔액' })).toHaveTextContent('0원')
    expect(screen.getByText('이 달의 지출 내역이 없습니다')).toBeInTheDocument()
    expect(screen.getByText('이 달의 내역이 없습니다')).toBeInTheDocument()
  })
})

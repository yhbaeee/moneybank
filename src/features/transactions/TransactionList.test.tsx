import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { asDateString } from '../../domain/date'
import { createSeedData } from '../../domain/defaults'
import type { Transaction } from '../../domain/types'
import { TransactionList } from './TransactionList'

const { categories, paymentMethods } = createSeedData()

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'x',
    type: 'expense',
    amount: 1000,
    date: asDateString('2026-10-27'),
    categoryId: 'cat-expense-1',
    paymentMethodId: 'pay-1',
    memo: '',
    tags: [],
    ownerId: 'member-me',
    createdAt: '2026-10-27T00:00:00.000Z',
    updatedAt: '2026-10-27T00:00:00.000Z',
    ...overrides,
  }
}

describe('TransactionList', () => {
  const list = [
    tx({ id: 'a', amount: 12000, memo: '점심', tags: ['외식'] }),
    tx({ id: 'b', type: 'income', categoryId: 'cat-income-1', amount: 3000000, memo: '급여' }),
    tx({ id: 'c', date: asDateString('2026-10-26'), amount: 4500 }),
  ]

  it('날짜별로 묶고 날짜 제목을 표시한다', () => {
    render(<TransactionList transactions={list} categories={categories} paymentMethods={paymentMethods} onSelect={() => {}} />)
    const groups = screen.getAllByRole('region')
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['10월 27일 (화)', '10월 26일 (월)'])
    expect(within(groups[0]).getAllByRole('button')).toHaveLength(2)
    expect(within(groups[1]).getAllByRole('button')).toHaveLength(1)
  })

  it('수입은 +, 지출은 - 부호와 함께 금액을 표시한다', () => {
    render(<TransactionList transactions={list} categories={categories} paymentMethods={paymentMethods} onSelect={() => {}} />)
    expect(screen.getByText('-12,000원')).toBeInTheDocument()
    expect(screen.getByText('+3,000,000원')).toBeInTheDocument()
  })

  it('카테고리, 결제수단, 메모, 태그를 표시한다', () => {
    render(<TransactionList transactions={list} categories={categories} paymentMethods={paymentMethods} onSelect={() => {}} />)
    const row = screen.getByRole('button', { name: /점심/ })
    expect(row).toHaveTextContent('식비')
    expect(row).toHaveTextContent('현금')
    expect(row).toHaveTextContent('#외식')
  })

  it('행을 누르면 해당 내역을 전달한다', async () => {
    const onSelect = vi.fn()
    render(<TransactionList transactions={list} categories={categories} paymentMethods={paymentMethods} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /급여/ }))
    expect(onSelect).toHaveBeenCalledWith(list[1])
  })

  it('삭제된 카테고리는 대체 문구로 표시한다', () => {
    render(
      <TransactionList
        transactions={[tx({ categoryId: 'gone' })]}
        categories={categories}
        paymentMethods={paymentMethods}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByText('(삭제된 카테고리)')).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { asDateString, asMonthString } from './date'
import { createSeedData } from './defaults'
import { aggregateExpensesByCategory, summarizeMonth, transactionsInMonth, UNKNOWN_CATEGORY_NAME } from './summary'
import type { Transaction } from './types'

const { categories } = createSeedData()
const OCT = asMonthString('2026-10')

let counter = 0
function tx(overrides: Partial<Transaction>): Transaction {
  counter += 1
  return {
    id: `t${counter}`,
    type: 'expense',
    amount: 1000,
    date: asDateString('2026-10-15'),
    categoryId: 'cat-expense-1',
    paymentMethodId: 'pay-1',
    memo: '',
    tags: [],
    ownerId: 'member-me',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('transactionsInMonth', () => {
  it('월의 첫날과 마지막 날은 포함하고 이웃 달은 제외한다', () => {
    const list = [
      tx({ date: asDateString('2026-09-30') }),
      tx({ date: asDateString('2026-10-01') }),
      tx({ date: asDateString('2026-10-31') }),
      tx({ date: asDateString('2026-11-01') }),
    ]
    expect(transactionsInMonth(list, OCT).map((t) => t.date)).toEqual(['2026-10-01', '2026-10-31'])
  })

  it('연도 경계를 구분한다', () => {
    const list = [tx({ date: asDateString('2025-12-31') }), tx({ date: asDateString('2026-01-01') })]
    expect(transactionsInMonth(list, asMonthString('2026-01'))).toHaveLength(1)
    expect(transactionsInMonth(list, asMonthString('2025-12'))).toHaveLength(1)
  })

  it('윤년 2월 29일은 2월에 속한다', () => {
    const list = [tx({ date: asDateString('2024-02-29') }), tx({ date: asDateString('2024-03-01') })]
    expect(transactionsInMonth(list, asMonthString('2024-02'))).toHaveLength(1)
  })
})

describe('summarizeMonth', () => {
  it('수입·지출·잔액·건수를 계산하고 다른 달은 제외한다', () => {
    const list = [
      tx({ type: 'income', categoryId: 'cat-income-1', amount: 3_000_000 }),
      tx({ amount: 12000 }),
      tx({ amount: 8000 }),
      tx({ amount: 5000, categoryId: 'cat-expense-2', date: asDateString('2026-10-31') }),
      tx({ amount: 99999, date: asDateString('2026-09-30') }),
      tx({ type: 'income', categoryId: 'cat-income-2', amount: 1000, date: asDateString('2026-11-01') }),
    ]
    expect(summarizeMonth(list, OCT)).toEqual({ income: 3_000_000, expense: 25000, balance: 2_975_000, count: 4 })
  })

  it('지출이 더 크면 잔액이 음수이다', () => {
    expect(summarizeMonth([tx({ amount: 5000 })], OCT)).toEqual({ income: 0, expense: 5000, balance: -5000, count: 1 })
  })

  it('내역이 없으면 모두 0이다', () => {
    expect(summarizeMonth([], OCT)).toEqual({ income: 0, expense: 0, balance: 0, count: 0 })
  })

  it('큰 금액도 정수 그대로 합산한다', () => {
    const list = [tx({ amount: 9_999_999_999 }), tx({ amount: 9_999_999_999 }), tx({ amount: 1 })]
    expect(summarizeMonth(list, OCT).expense).toBe(20_000_000_000 - 1)
  })
})

describe('aggregateExpensesByCategory', () => {
  it('지출만 카테고리별로 합산해 금액이 큰 순서로 정렬한다', () => {
    const list = [
      tx({ amount: 12000, categoryId: 'cat-expense-1' }),
      tx({ amount: 8000, categoryId: 'cat-expense-1' }),
      tx({ amount: 5000, categoryId: 'cat-expense-2' }),
      tx({ type: 'income', categoryId: 'cat-income-1', amount: 3_000_000 }),
      tx({ amount: 77777, categoryId: 'cat-expense-4', date: asDateString('2026-09-30') }),
    ]
    const result = aggregateExpensesByCategory(list, categories, OCT)
    expect(result.map((r) => [r.name, r.amount, r.permille])).toEqual([
      ['식비', 20000, 800],
      ['교통', 5000, 200],
    ])
    expect(result[0].color).toBe(categories[0].color)
  })

  it('비율의 합은 항상 1000이다', () => {
    const list = [
      tx({ amount: 1000, categoryId: 'cat-expense-1' }),
      tx({ amount: 1000, categoryId: 'cat-expense-2' }),
      tx({ amount: 1000, categoryId: 'cat-expense-4' }),
    ]
    const result = aggregateExpensesByCategory(list, categories, OCT)
    expect(result.map((r) => r.permille)).toEqual([334, 333, 333])
    expect(result.reduce((sum, r) => sum + r.permille, 0)).toBe(1000)
  })

  it('금액이 같으면 카테고리 표시 순서를 따른다', () => {
    const list = [tx({ categoryId: 'cat-expense-4' }), tx({ categoryId: 'cat-expense-1' }), tx({ categoryId: 'cat-expense-2' })]
    expect(aggregateExpensesByCategory(list, categories, OCT).map((r) => r.name)).toEqual(['식비', '교통', '쇼핑'])
  })

  it('존재하지 않는 카테고리는 대체 이름으로 묶어 마지막에 둔다', () => {
    const list = [tx({ amount: 9000, categoryId: 'gone' }), tx({ amount: 1000, categoryId: 'cat-expense-1' })]
    const result = aggregateExpensesByCategory(list, categories, OCT)
    expect(result.map((r) => r.name)).toEqual(['식비', UNKNOWN_CATEGORY_NAME])
  })

  it('지출이 없으면 빈 배열이다', () => {
    expect(aggregateExpensesByCategory([], categories, OCT)).toEqual([])
    expect(aggregateExpensesByCategory([tx({ type: 'income', categoryId: 'cat-income-1' })], categories, OCT)).toEqual([])
  })
})

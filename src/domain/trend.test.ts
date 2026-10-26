import { describe, expect, it } from 'vitest'
import { asDateString, asMonthString } from './date'
import type { Transaction } from './types'
import { monthlyTrend } from './trend'

let counter = 0
function tx(date: string, amount: number, type: Transaction['type'] = 'expense'): Transaction {
  counter += 1
  return {
    id: `t${counter}`,
    type,
    amount,
    date: asDateString(date),
    categoryId: type === 'expense' ? 'cat-expense-1' : 'cat-income-1',
    paymentMethodId: 'pay-1',
    memo: '',
    tags: [],
    ownerId: 'member-me',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('monthlyTrend', () => {
  it('끝 달을 포함한 최근 6개월을 오래된 순으로 돌려준다', () => {
    const result = monthlyTrend([], asMonthString('2026-10'))
    expect(result.map((r) => r.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
  })

  it('월별 수입·지출을 합산하고 내역이 없는 달은 0이다', () => {
    const list = [
      tx('2026-10-01', 3_000_000, 'income'),
      tx('2026-10-10', 20_000),
      tx('2026-10-11', 10_000),
      tx('2026-08-15', 30_000),
      tx('2026-05-31', 5_000),
      tx('2026-05-01', 1_000, 'income'),
    ]
    expect(monthlyTrend(list, asMonthString('2026-10'))).toEqual([
      { month: '2026-05', income: 1_000, expense: 5_000 },
      { month: '2026-06', income: 0, expense: 0 },
      { month: '2026-07', income: 0, expense: 0 },
      { month: '2026-08', income: 0, expense: 30_000 },
      { month: '2026-09', income: 0, expense: 0 },
      { month: '2026-10', income: 3_000_000, expense: 30_000 },
    ])
  })

  it('창 밖의 달(앞·뒤)은 제외한다', () => {
    const list = [tx('2026-04-30', 99_999), tx('2026-11-01', 88_888), tx('2026-05-01', 1)]
    const result = monthlyTrend(list, asMonthString('2026-10'))
    expect(result.reduce((sum, r) => sum + r.expense, 0)).toBe(1)
  })

  it('연도 경계를 넘는 창을 만든다', () => {
    const list = [tx('2026-12-31', 100), tx('2027-01-01', 200), tx('2026-08-01', 300)]
    const result = monthlyTrend(list, asMonthString('2027-01'))
    expect(result.map((r) => r.month)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'])
    expect(result.map((r) => r.expense)).toEqual([300, 0, 0, 0, 100, 200])
  })

  it('지원 범위(1900년) 앞쪽의 달은 건너뛴다', () => {
    const result = monthlyTrend([], asMonthString('1900-03'))
    expect(result.map((r) => r.month)).toEqual(['1900-01', '1900-02', '1900-03'])
  })

  it('개월 수를 지정할 수 있다', () => {
    expect(monthlyTrend([], asMonthString('2026-10'), 3).map((r) => r.month)).toEqual(['2026-08', '2026-09', '2026-10'])
  })

  it('큰 금액도 정수로 합산한다', () => {
    const list = [tx('2026-10-01', 9_999_999_999), tx('2026-10-02', 9_999_999_999)]
    expect(monthlyTrend(list, asMonthString('2026-10')).at(-1)?.expense).toBe(19_999_999_998)
  })
})

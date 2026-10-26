import { describe, expect, it } from 'vitest'
import { asDateString } from './date'
import { createSeedData } from './defaults'
import {
  EMPTY_FILTERS,
  collectTags,
  countSelectFilters,
  filterTransactions,
  hasActiveFilters,
  type TransactionFilters,
} from './filter'
import type { Transaction } from './types'

const { categories } = createSeedData()

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

const lunch = tx({ id: 'lunch', memo: '점심 회식', tags: ['외식', '회사'], paymentMethodId: 'pay-2' })
const bus = tx({ id: 'bus', memo: '버스', categoryId: 'cat-expense-2' })
const shoes = tx({ id: 'shoes', memo: '운동화', categoryId: 'cat-expense-4', tags: ['운동'], paymentMethodId: 'pay-3' })
const coffee = tx({ id: 'coffee', memo: 'Coffee', tags: ['카페', 'Work'] })
const salary = tx({
  id: 'salary',
  type: 'income',
  categoryId: 'cat-income-1',
  memo: '10월 급여',
  tags: ['회사'],
  paymentMethodId: 'pay-4',
})
const all = [lunch, bus, shoes, coffee, salary]

function ids(filters: Partial<TransactionFilters>) {
  return filterTransactions(all, { ...EMPTY_FILTERS, ...filters }, categories).map((t) => t.id)
}

describe('filterTransactions: 검색', () => {
  it('필터가 없으면 전체를 입력 순서대로 돌려준다', () => {
    expect(ids({})).toEqual(['lunch', 'bus', 'shoes', 'coffee', 'salary'])
  })

  it('메모를 부분 일치로 검색한다', () => {
    expect(ids({ query: '점심' })).toEqual(['lunch'])
    expect(ids({ query: '회식' })).toEqual(['lunch'])
    expect(ids({ query: '급' })).toEqual(['salary'])
  })

  it('대소문자를 구분하지 않는다', () => {
    expect(ids({ query: 'COFFEE' })).toEqual(['coffee'])
    expect(ids({ query: 'work' })).toEqual(['coffee'])
  })

  it('태그를 검색하며 앞의 #은 무시한다', () => {
    expect(ids({ query: '#회사' })).toEqual(['lunch', 'salary'])
    expect(ids({ query: '회사' })).toEqual(['lunch', 'salary'])
    expect(ids({ query: '##운동' })).toEqual(['shoes'])
  })

  it('카테고리명을 검색한다', () => {
    expect(ids({ query: '교통' })).toEqual(['bus'])
    expect(ids({ query: '식비' })).toEqual(['lunch', 'coffee'])
  })

  it('여러 단어는 모두 일치해야 한다(각 단어는 서로 다른 필드여도 된다)', () => {
    expect(ids({ query: '식비 coffee' })).toEqual(['coffee'])
    expect(ids({ query: '점심 회사' })).toEqual(['lunch'])
    expect(ids({ query: '식비 운동' })).toEqual([])
    expect(ids({ query: '  점심   회식  ' })).toEqual(['lunch'])
  })

  it('공백이나 #만 입력하면 필터가 없는 것과 같다', () => {
    expect(ids({ query: '   ' })).toHaveLength(5)
    expect(ids({ query: '#' })).toHaveLength(5)
  })

  it('한글 조합 형태(NFC/NFD)가 달라도 찾는다', () => {
    expect(ids({ query: '점심'.normalize('NFD') })).toEqual(['lunch'])
    const decomposed = tx({ id: 'nfd', memo: '커피'.normalize('NFD') })
    expect(
      filterTransactions([decomposed], { ...EMPTY_FILTERS, query: '커피'.normalize('NFC') }, categories),
    ).toHaveLength(1)
  })

  it('일치하는 것이 없으면 빈 배열이다', () => {
    expect(ids({ query: '존재하지않음' })).toEqual([])
  })
})

describe('filterTransactions: 선택형 필터', () => {
  it('유형으로 거른다', () => {
    expect(ids({ type: 'income' })).toEqual(['salary'])
    expect(ids({ type: 'expense' })).toEqual(['lunch', 'bus', 'shoes', 'coffee'])
  })

  it('카테고리로 거른다', () => {
    expect(ids({ categoryId: 'cat-expense-2' })).toEqual(['bus'])
  })

  it('결제수단으로 거른다', () => {
    expect(ids({ paymentMethodId: 'pay-1' })).toEqual(['bus', 'coffee'])
  })

  it('태그로 거르며 대소문자는 무시하고 완전 일치만 허용한다', () => {
    expect(ids({ tag: '회사' })).toEqual(['lunch', 'salary'])
    expect(ids({ tag: 'WORK' })).toEqual(['coffee'])
    expect(ids({ tag: '회' })).toEqual([])
  })

  it('모든 조건은 AND로 결합한다', () => {
    expect(ids({ type: 'expense', tag: '회사' })).toEqual(['lunch'])
    expect(ids({ type: 'expense', paymentMethodId: 'pay-1', query: 'coffee' })).toEqual(['coffee'])
    expect(ids({ type: 'income', categoryId: 'cat-expense-1' })).toEqual([])
  })

  it('원본 배열을 변경하지 않는다', () => {
    const copy = [...all]
    ids({ query: '점심' })
    expect(all).toEqual(copy)
  })
})

describe('hasActiveFilters / countSelectFilters', () => {
  it('활성 필터를 센다', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: '  ' })).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: 'a' })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, type: 'income' })).toBe(true)
    expect(countSelectFilters({ ...EMPTY_FILTERS, query: 'a' })).toBe(0)
    expect(countSelectFilters({ query: 'a', type: 'expense', categoryId: 'x', paymentMethodId: 'y', tag: 'z' })).toBe(4)
  })
})

describe('collectTags', () => {
  it('대소문자 무시 중복을 제거하고 가나다순으로 정렬한다', () => {
    const list = [tx({ tags: ['카페', 'Work'] }), tx({ tags: ['work', '회사', '가계'] }), tx({ tags: [] })]
    expect(collectTags(list)).toEqual(['가계', '카페', '회사', 'Work'])
  })

  it('태그가 없으면 빈 배열이다', () => {
    expect(collectTags([])).toEqual([])
  })
})

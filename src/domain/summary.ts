import { monthOf } from './date'
import { sumAmounts } from './money'
import { allocatePermille } from './percent'
import type { Category, MonthString, Transaction } from './types'

export const UNKNOWN_CATEGORY_NAME = '(삭제된 카테고리)'
const UNKNOWN_CATEGORY_COLOR = '#64748b'

export interface MonthSummary {
  income: number
  expense: number
  /** 수입 − 지출. 음수일 수 있다. */
  balance: number
  /** 해당 월의 거래 건수 */
  count: number
}

export interface CategoryShare {
  categoryId: string
  name: string
  color: string
  amount: number
  /** 지출 합계 대비 비율(‰). 전체 합은 1000. */
  permille: number
}

/** 월 경계는 날짜 문자열의 `YYYY-MM`으로만 판정한다. 입력 순서는 유지한다. */
export function transactionsInMonth(transactions: readonly Transaction[], month: MonthString): Transaction[] {
  return transactions.filter((transaction) => monthOf(transaction.date) === month)
}

export function summarizeMonth(transactions: readonly Transaction[], month: MonthString): MonthSummary {
  const inMonth = transactionsInMonth(transactions, month)
  const income = sumAmounts(inMonth.filter((t) => t.type === 'income').map((t) => t.amount))
  const expense = sumAmounts(inMonth.filter((t) => t.type === 'expense').map((t) => t.amount))
  return { income, expense, balance: income - expense, count: inMonth.length }
}

/**
 * 해당 월 지출을 카테고리별로 집계한다. 금액이 큰 순서(동액이면 카테고리 표시 순서)로 정렬하며,
 * 존재하지 않는 카테고리의 거래는 하나로 묶어 마지막에 둔다.
 */
export function aggregateExpensesByCategory(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  month: MonthString,
): CategoryShare[] {
  const amountsByCategory = new Map<string, number[]>()
  for (const transaction of transactionsInMonth(transactions, month)) {
    if (transaction.type !== 'expense') continue
    const list = amountsByCategory.get(transaction.categoryId) ?? []
    list.push(transaction.amount)
    amountsByCategory.set(transaction.categoryId, list)
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const rows = [...amountsByCategory].map(([categoryId, amounts]) => {
    const category = categoryById.get(categoryId)
    return {
      categoryId,
      name: category?.name ?? UNKNOWN_CATEGORY_NAME,
      color: category?.color ?? UNKNOWN_CATEGORY_COLOR,
      amount: sumAmounts(amounts),
      known: category !== undefined,
      sortOrder: category?.sortOrder ?? Number.MAX_SAFE_INTEGER,
    }
  })

  rows.sort((a, b) => Number(b.known) - Number(a.known) || b.amount - a.amount || a.sortOrder - b.sortOrder)

  const permilles = allocatePermille(rows.map((row) => row.amount))
  return rows.map((row, index) => ({
    categoryId: row.categoryId,
    name: row.name,
    color: row.color,
    amount: row.amount,
    permille: permilles[index],
  }))
}

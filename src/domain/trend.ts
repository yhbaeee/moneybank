import { monthOf, safeAddMonths } from './date'
import { sumAmounts } from './money'
import type { MonthString, Transaction } from './types'

export const TREND_MONTHS = 6

export interface MonthlyTotal {
  month: MonthString
  income: number
  expense: number
}

/**
 * endMonth를 마지막 달로 하는 최근 count개월의 월별 수입·지출 합계(오래된 달 → 최근 달).
 * 내역이 없는 달은 0이다. 지원 범위(1900년) 앞쪽의 달은 건너뛰므로 count보다 적게 반환할 수 있다.
 */
export function monthlyTrend(
  transactions: readonly Transaction[],
  endMonth: MonthString,
  count: number = TREND_MONTHS,
): MonthlyTotal[] {
  const months: MonthString[] = []
  for (let offset = count - 1; offset >= 0; offset--) {
    const month = safeAddMonths(endMonth, -offset)
    if (month) months.push(month)
  }

  const buckets = new Map(months.map((month) => [month, { income: [] as number[], expense: [] as number[] }]))
  for (const transaction of transactions) {
    buckets.get(monthOf(transaction.date))?.[transaction.type].push(transaction.amount)
  }

  return months.map((month) => {
    const bucket = buckets.get(month)!
    return { month, income: sumAmounts(bucket.income), expense: sumAmounts(bucket.expense) }
  })
}

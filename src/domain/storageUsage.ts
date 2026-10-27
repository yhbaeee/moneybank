/** 저장 공간 사용량 요약(표시용). 건당 문자 수가 일정하지 않으므로 남은 건수는 현재 평균으로 추정한다. */

export const USAGE_WARNING_PERCENT = 80
export const USAGE_CRITICAL_PERCENT = 95

/** 내역이 아직 없을 때 쓰는 건당 평균 문자 수(실측 약 250자) */
const DEFAULT_CHARS_PER_TRANSACTION = 250

export type UsageLevel = 'ok' | 'warning' | 'critical'

export interface UsageInput {
  usedChars: number
  limitChars: number
}

export interface UsageSummary {
  /** 0~100 정수(버림). 상한이 없으면 0 */
  percent: number
  level: UsageLevel
  /** 지금 추세로 더 저장할 수 있는 내역 수(추정). 상한이 없으면 null */
  remainingTransactions: number | null
}

export function summarizeUsage(usage: UsageInput, transactionCount: number): UsageSummary {
  if (!Number.isFinite(usage.limitChars) || usage.limitChars <= 0) {
    return { percent: 0, level: 'ok', remainingTransactions: null }
  }

  const percent = Math.min(100, Math.floor((usage.usedChars * 100) / usage.limitChars))
  const level: UsageLevel =
    percent >= USAGE_CRITICAL_PERCENT ? 'critical' : percent >= USAGE_WARNING_PERCENT ? 'warning' : 'ok'

  const averageChars = transactionCount > 0 ? usage.usedChars / transactionCount : DEFAULT_CHARS_PER_TRANSACTION
  const remainingTransactions = Math.max(0, Math.floor((usage.limitChars - usage.usedChars) / averageChars))
  return { percent, level, remainingTransactions }
}

/** 문자 수를 "3.1MB"로 표시한다(대략적인 크기이며 소수 첫째 자리까지). */
export function formatMegabytes(chars: number): string {
  return `${(chars / 1_000_000).toFixed(1)}MB`
}

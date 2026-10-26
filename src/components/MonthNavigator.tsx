import { currentMonth, formatKoreanMonth, safeAddMonths } from '../domain/date'
import type { MonthString } from '../domain/types'
import { Button } from './Button'

interface MonthNavigatorProps {
  month: MonthString
  onChange: (month: MonthString) => void
}

/** 이전 달 / 다음 달 / 이번 달 이동. 지원 범위(1900~2999년)의 끝에서는 해당 버튼이 비활성화된다. */
export function MonthNavigator({ month, onChange }: MonthNavigatorProps) {
  const previous = safeAddMonths(month, -1)
  const next = safeAddMonths(month, 1)
  const thisMonth = currentMonth()

  return (
    <nav aria-label="월 이동" className="flex items-center gap-2">
      <Button variant="secondary" aria-label="이전 달" disabled={previous === null} onClick={() => previous && onChange(previous)}>
        ‹
      </Button>
      <p aria-live="polite" className="min-w-28 text-center text-lg font-bold">
        {formatKoreanMonth(month)}
      </p>
      <Button variant="secondary" aria-label="다음 달" disabled={next === null} onClick={() => next && onChange(next)}>
        ›
      </Button>
      <Button variant="ghost" disabled={month === thisMonth} onClick={() => onChange(thisMonth)}>
        이번 달
      </Button>
    </nav>
  )
}

import { useMemo, useState, type ReactNode } from 'react'
import { currentMonth } from '../domain/date'
import type { MonthString } from '../domain/types'
import { SelectedMonthContext, type SelectedMonthValue } from './selectedMonthContext'

/** 선택한 월 상태. 기본값은 로컬 기준 이번 달이다. */
export function SelectedMonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState<MonthString>(() => currentMonth())
  const value = useMemo<SelectedMonthValue>(() => ({ month, setMonth }), [month])
  return <SelectedMonthContext.Provider value={value}>{children}</SelectedMonthContext.Provider>
}

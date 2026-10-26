import { createContext, useContext } from 'react'
import type { MonthString } from '../domain/types'

export interface SelectedMonthValue {
  /** 요약·집계·목록이 기준으로 삼는 월 */
  month: MonthString
  setMonth: (month: MonthString) => void
}

export const SelectedMonthContext = createContext<SelectedMonthValue | null>(null)

export function useSelectedMonth(): SelectedMonthValue {
  const value = useContext(SelectedMonthContext)
  if (!value) throw new Error('useSelectedMonth는 SelectedMonthProvider 안에서 사용해야 합니다.')
  return value
}

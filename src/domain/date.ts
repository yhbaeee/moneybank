import type { DateString, MonthString } from './types'

/**
 * 날짜는 시간대 없는 문자열(`YYYY-MM-DD`, `YYYY-MM`)로만 다룬다.
 * `new Date('YYYY-MM-DD')`는 UTC로 해석되어 월 경계가 어긋나므로 사용하지 않는다.
 */

export const MIN_YEAR = 1900
export const MAX_YEAR = 2999

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0')
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** month는 1~12 */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isValidYearMonth(year: number, month: number): boolean {
  return year >= MIN_YEAR && year <= MAX_YEAR && month >= 1 && month <= 12
}

export function isValidMonthString(value: unknown): value is MonthString {
  if (typeof value !== 'string') return false
  const match = MONTH_PATTERN.exec(value)
  return match !== null && isValidYearMonth(Number(match[1]), Number(match[2]))
}

/** 형식이 맞고 실제로 존재하는 날짜인지 검사한다(2월 30일, 평년 2월 29일 거부). */
export function isValidDateString(value: unknown): value is DateString {
  if (typeof value !== 'string') return false
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  return isValidYearMonth(year, month) && day >= 1 && day <= daysInMonth(year, month)
}

export function asDateString(value: string): DateString {
  if (!isValidDateString(value)) throw new RangeError(`올바르지 않은 날짜: ${value}`)
  return value
}

export function asMonthString(value: string): MonthString {
  if (!isValidMonthString(value)) throw new RangeError(`올바르지 않은 월: ${value}`)
  return value
}

/** Date의 로컬 연·월·일로 날짜 문자열을 만든다(UTC 변환 없음). */
export function toDateString(date: Date): DateString {
  return asDateString(`${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`)
}

/** 로컬 기준 오늘. 테스트에서는 now를 주입한다. */
export function todayString(now: Date = new Date()): DateString {
  return toDateString(now)
}

export function monthOf(date: DateString): MonthString {
  return date.slice(0, 7) as MonthString
}

export function currentMonth(now: Date = new Date()): MonthString {
  return monthOf(todayString(now))
}

function parseMonth(month: MonthString): { year: number; month: number } {
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) }
}

/** 월 이동. 연도 경계를 넘어도 올바르게 계산한다(2026-12 + 1 → 2027-01). */
export function addMonths(month: MonthString, delta: number): MonthString {
  const { year, month: m } = parseMonth(month)
  const index = year * 12 + (m - 1) + delta
  const nextYear = Math.floor(index / 12)
  const nextMonth = (index % 12 + 12) % 12 + 1
  return asMonthString(`${pad(nextYear, 4)}-${pad(nextMonth, 2)}`)
}

export function monthStart(month: MonthString): DateString {
  return asDateString(`${month}-01`)
}

export function monthEnd(month: MonthString): DateString {
  const { year, month: m } = parseMonth(month)
  return asDateString(`${month}-${pad(daysInMonth(year, m), 2)}`)
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** "10월 27일 (화)". 요일은 로컬 Date 생성자로 계산한다(UTC 해석 없음). */
export function formatKoreanDate(date: DateString): string {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  return `${month}월 ${day}일 (${WEEKDAYS[new Date(year, month - 1, day).getDay()]})`
}

/** "2026년 10월" */
export function formatKoreanMonth(month: MonthString): string {
  const { year, month: m } = parseMonth(month)
  return `${year}년 ${m}월`
}

/** 월 이동. 지원 범위(1900~2999년)를 벗어나면 예외 대신 null을 돌려준다. */
export function safeAddMonths(month: MonthString, delta: number): MonthString | null {
  try {
    return addMonths(month, delta)
  } catch {
    return null
  }
}

/** 등록 폼의 날짜 기본값. 보고 있는 달이 이번 달이면 오늘, 아니면 그 달의 1일. */
export function defaultEntryDate(month: MonthString, today: DateString): DateString {
  return monthOf(today) === month ? today : monthStart(month)
}

import { describe, expect, it } from 'vitest'
import {
  addMonths,
  asDateString,
  asMonthString,
  currentMonth,
  formatKoreanDate,
  formatKoreanMonth,
  daysInMonth,
  defaultEntryDate,
  safeAddMonths,
  isLeapYear,
  isValidDateString,
  isValidMonthString,
  monthEnd,
  monthOf,
  monthStart,
  toDateString,
  todayString,
} from './date'

describe('윤년과 월의 일수', () => {
  it('윤년을 판정한다', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(2100)).toBe(false)
    expect(isLeapYear(2026)).toBe(false)
  })

  it('월별 일수를 계산한다', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
  })
})

describe('월별 일수 전체 검증', () => {
  // [월, 평년 일수, 윤년 일수]
  const MONTHS: [number, number, number][] = [
    [1, 31, 31],
    [2, 28, 29],
    [3, 31, 31],
    [4, 30, 30],
    [5, 31, 31],
    [6, 30, 30],
    [7, 31, 31],
    [8, 31, 31],
    [9, 30, 30],
    [10, 31, 31],
    [11, 30, 30],
    [12, 31, 31],
  ]

  it.each(MONTHS)('%d월: 평년 %d일, 윤년 %d일', (month, common, leap) => {
    expect(daysInMonth(2026, month)).toBe(common)
    expect(daysInMonth(2024, month)).toBe(leap)
  })

  it.each(MONTHS)('%d월: 마지막 날은 유효하고 그 다음 날은 무효이다', (month, common) => {
    const mm = String(month).padStart(2, '0')
    expect(isValidDateString(`2026-${mm}-${String(common).padStart(2, '0')}`)).toBe(true)
    expect(isValidDateString(`2026-${mm}-${String(common + 1).padStart(2, '0')}`)).toBe(false)
    expect(monthEnd(asMonthString(`2026-${mm}`))).toBe(`2026-${mm}-${String(common).padStart(2, '0')}`)
  })
})

describe('isValidDateString', () => {
  it('실제로 존재하는 날짜만 허용한다', () => {
    expect(isValidDateString('2026-10-27')).toBe(true)
    expect(isValidDateString('2024-02-29')).toBe(true)
    expect(isValidDateString('2026-12-31')).toBe(true)
  })

  it.each(['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '2026-04-31', '2026-1-1', '26-01-01', '', '2026-01-01T00:00', '1899-12-31'])(
    '"%s"는 거부한다',
    (value) => {
      expect(isValidDateString(value)).toBe(false)
    },
  )

  it('문자열이 아니면 거부한다', () => {
    expect(isValidDateString(20261027)).toBe(false)
    expect(isValidDateString(null)).toBe(false)
  })
})

describe('isValidMonthString', () => {
  it('YYYY-MM 형식만 허용한다', () => {
    expect(isValidMonthString('2026-10')).toBe(true)
    expect(isValidMonthString('2026-13')).toBe(false)
    expect(isValidMonthString('2026-1')).toBe(false)
    expect(isValidMonthString('2026-10-01')).toBe(false)
  })
})

describe('as* 변환', () => {
  it('올바르지 않으면 RangeError를 던진다', () => {
    expect(() => asDateString('2026-02-30')).toThrow(RangeError)
    expect(() => asMonthString('2026-00')).toThrow(RangeError)
    expect(asDateString('2026-02-28')).toBe('2026-02-28')
  })
})

describe('toDateString / todayString', () => {
  it('로컬 연·월·일을 사용한다(월 말 늦은 시각, 월 초 이른 시각)', () => {
    expect(toDateString(new Date(2026, 0, 31, 23, 59, 59))).toBe('2026-01-31')
    expect(toDateString(new Date(2026, 1, 1, 0, 0, 0))).toBe('2026-02-01')
    expect(toDateString(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31')
  })

  it('월과 일을 두 자리로 채운다', () => {
    expect(toDateString(new Date(2026, 2, 5))).toBe('2026-03-05')
  })

  it('now를 주입할 수 있다', () => {
    const now = new Date(2024, 1, 29, 12)
    expect(todayString(now)).toBe('2024-02-29')
    expect(currentMonth(now)).toBe('2024-02')
  })
})

describe('monthOf / monthStart / monthEnd', () => {
  it('날짜에서 월을 뽑는다', () => {
    expect(monthOf(asDateString('2026-10-27'))).toBe('2026-10')
  })

  it('월의 첫날과 마지막 날을 계산한다', () => {
    expect(monthStart(asMonthString('2026-10'))).toBe('2026-10-01')
    expect(monthEnd(asMonthString('2026-10'))).toBe('2026-10-31')
    expect(monthEnd(asMonthString('2024-02'))).toBe('2024-02-29')
    expect(monthEnd(asMonthString('2026-02'))).toBe('2026-02-28')
    expect(monthEnd(asMonthString('2100-02'))).toBe('2100-02-28')
    expect(monthEnd(asMonthString('2000-02'))).toBe('2000-02-29')
    expect(monthEnd(asMonthString('2026-04'))).toBe('2026-04-30')
  })
})

describe('addMonths', () => {
  it('연도 경계를 넘어 이동한다', () => {
    expect(addMonths(asMonthString('2026-12'), 1)).toBe('2027-01')
    expect(addMonths(asMonthString('2026-01'), -1)).toBe('2025-12')
  })

  it('여러 달·여러 해를 이동한다', () => {
    expect(addMonths(asMonthString('2026-10'), 0)).toBe('2026-10')
    expect(addMonths(asMonthString('2026-10'), 3)).toBe('2027-01')
    expect(addMonths(asMonthString('2026-03'), -5)).toBe('2025-10')
    expect(addMonths(asMonthString('2026-06'), 24)).toBe('2028-06')
    expect(addMonths(asMonthString('2026-01'), -12)).toBe('2025-01')
  })

  it('지원 범위를 벗어나면 오류를 던진다', () => {
    expect(() => addMonths(asMonthString('2999-12'), 1)).toThrow(RangeError)
    expect(() => addMonths(asMonthString('1900-01'), -1)).toThrow(RangeError)
  })
})

describe('formatKoreanDate', () => {
  it('월, 일, 요일을 표시한다', () => {
    expect(formatKoreanDate(asDateString('2026-10-27'))).toBe('10월 27일 (화)')
    expect(formatKoreanDate(asDateString('2024-02-29'))).toBe('2월 29일 (목)')
    expect(formatKoreanDate(asDateString('2026-01-01'))).toBe('1월 1일 (목)')
  })
})

describe('formatKoreanMonth', () => {
  it('연도와 월을 표시한다', () => {
    expect(formatKoreanMonth(asMonthString('2026-10'))).toBe('2026년 10월')
    expect(formatKoreanMonth(asMonthString('2027-01'))).toBe('2027년 1월')
  })
})

describe('safeAddMonths', () => {
  it('범위 안이면 addMonths와 같다', () => {
    expect(safeAddMonths(asMonthString('2026-12'), 1)).toBe('2027-01')
    expect(safeAddMonths(asMonthString('2026-01'), -1)).toBe('2025-12')
  })

  it('지원 범위 끝에서는 null을 돌려준다', () => {
    expect(safeAddMonths(asMonthString('2999-12'), 1)).toBeNull()
    expect(safeAddMonths(asMonthString('1900-01'), -1)).toBeNull()
    expect(safeAddMonths(asMonthString('2999-11'), 1)).toBe('2999-12')
  })
})

describe('defaultEntryDate', () => {
  const today = asDateString('2026-10-27')

  it('이번 달을 보고 있으면 오늘이다', () => {
    expect(defaultEntryDate(asMonthString('2026-10'), today)).toBe('2026-10-27')
  })

  it('다른 달을 보고 있으면 그 달의 1일이다', () => {
    expect(defaultEntryDate(asMonthString('2026-09'), today)).toBe('2026-09-01')
    expect(defaultEntryDate(asMonthString('2027-01'), today)).toBe('2027-01-01')
  })
})

import { describe, expect, it } from 'vitest'
import { formatMegabytes, summarizeUsage } from './storageUsage'

const LIMIT = 5_000_000

describe('summarizeUsage', () => {
  it('사용 비율을 정수(버림)로 계산하고 80% 미만이면 ok이다', () => {
    expect(summarizeUsage({ usedChars: 0, limitChars: LIMIT }, 0)).toMatchObject({ percent: 0, level: 'ok' })
    expect(summarizeUsage({ usedChars: 3_999_999, limitChars: LIMIT }, 1000)).toMatchObject({ percent: 79, level: 'ok' })
  })

  it('80%부터 warning, 95%부터 critical이다(경계 포함)', () => {
    expect(summarizeUsage({ usedChars: 4_000_000, limitChars: LIMIT }, 1000)).toMatchObject({ percent: 80, level: 'warning' })
    expect(summarizeUsage({ usedChars: 4_749_999, limitChars: LIMIT }, 1000)).toMatchObject({ percent: 94, level: 'warning' })
    expect(summarizeUsage({ usedChars: 4_750_000, limitChars: LIMIT }, 1000)).toMatchObject({ percent: 95, level: 'critical' })
  })

  it('상한을 넘어도 100%로 제한하고 남은 건수는 0이다', () => {
    expect(summarizeUsage({ usedChars: 6_000_000, limitChars: LIMIT }, 20_000)).toEqual({
      percent: 100,
      level: 'critical',
      remainingTransactions: 0,
    })
  })

  it('남은 건수는 현재 건당 평균 문자 수로 추정한다', () => {
    // 건당 250자: 남은 2,000,000자 → 8,000건
    expect(summarizeUsage({ usedChars: 3_000_000, limitChars: LIMIT }, 12_000).remainingTransactions).toBe(8_000)
  })

  it('내역이 없으면 기본 건당 문자 수(250자)로 추정한다', () => {
    expect(summarizeUsage({ usedChars: 5_000, limitChars: LIMIT }, 0).remainingTransactions).toBe(19_980)
  })

  it('상한이 없으면(임시 저장소) 0%·ok이고 남은 건수는 알 수 없다', () => {
    expect(summarizeUsage({ usedChars: 10_000_000, limitChars: Number.POSITIVE_INFINITY }, 100)).toEqual({
      percent: 0,
      level: 'ok',
      remainingTransactions: null,
    })
    expect(summarizeUsage({ usedChars: 1, limitChars: 0 }, 1).remainingTransactions).toBeNull()
  })
})

describe('formatMegabytes', () => {
  it('문자 수를 소수 첫째 자리 MB로 표시한다', () => {
    expect(formatMegabytes(0)).toBe('0.0MB')
    expect(formatMegabytes(3_110_000)).toBe('3.1MB')
    expect(formatMegabytes(5_000_000)).toBe('5.0MB')
  })
})

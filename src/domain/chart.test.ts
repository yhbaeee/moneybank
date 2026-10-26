import { describe, expect, it } from 'vitest'
import { donutSegments, formatCompactWon, niceScale } from './chart'

describe('niceScale', () => {
  it.each([
    [25_000, 10_000, 30_000],
    [20_000, 5_000, 20_000],
    [100_000, 50_000, 100_000],
    [3_000_000, 1_000_000, 3_000_000],
    [10_000_000_000, 5_000_000_000, 10_000_000_000],
    [9_999_999_999, 5_000_000_000, 10_000_000_000],
    [1, 1, 1],
    [3, 1, 3],
    [7, 2, 8],
    [1_500, 500, 1_500],
    [1_600, 500, 2_000],
  ])('최댓값 %d → 간격 %d, 눈금 최댓값 %d', (max, step, niceMax) => {
    const scale = niceScale(max)
    expect(scale.step).toBe(step)
    expect(scale.max).toBe(niceMax)
  })

  it('눈금은 0부터 step 간격이고 입력 최댓값 이상을 덮는다', () => {
    const scale = niceScale(25_000)
    expect(scale.ticks).toEqual([0, 10_000, 20_000, 30_000])
    for (const max of [1, 2, 9, 99, 1234, 56_789, 1_000_001, 987_654_321]) {
      const result = niceScale(max)
      expect(result.max).toBeGreaterThanOrEqual(max)
      expect(result.max % result.step).toBe(0)
      expect(result.ticks[0]).toBe(0)
      expect(result.ticks[result.ticks.length - 1]).toBe(result.max)
      expect(result.ticks.length).toBeLessThanOrEqual(6)
    }
  })

  it('0이나 잘못된 값은 눈금 0 하나만 돌려준다', () => {
    expect(niceScale(0)).toEqual({ max: 0, step: 1, ticks: [0] })
    expect(niceScale(-5).ticks).toEqual([0])
    expect(niceScale(NaN).ticks).toEqual([0])
  })
})

describe('formatCompactWon', () => {
  it.each([
    [0, '0'],
    [5_000, '5,000'],
    [9_999, '9,999'],
    [10_000, '1만'],
    [12_345, '1.2만'],
    [25_000, '2.5만'],
    [3_000_000, '300만'],
    [99_990_000, '9,999만'],
    [99_999_999, '1억'],
    [100_000_000, '1억'],
    [120_000_000, '1.2억'],
    [9_999_999_999, '100억'],
  ])('%d → %s', (value, expected) => {
    expect(formatCompactWon(value)).toBe(expected)
  })
})

describe('donutSegments', () => {
  const circumference = 300

  it('호 길이의 합은 둘레와 같고 시작 위치가 누적된다', () => {
    const segments = donutSegments([500, 300, 200], circumference)
    expect(segments).toEqual([
      { length: 150, start: 0 },
      { length: 90, start: 150 },
      { length: 60, start: 240 },
    ])
    expect(segments.reduce((sum, s) => sum + s.length, 0)).toBeCloseTo(circumference)
  })

  it('하나뿐이면 전체 둘레를 차지한다', () => {
    expect(donutSegments([1000], circumference)).toEqual([{ length: 300, start: 0 }])
  })

  it('3등분(334/333/333)도 합이 둘레와 같다', () => {
    const segments = donutSegments([334, 333, 333], circumference)
    expect(segments.reduce((sum, s) => sum + s.length, 0)).toBeCloseTo(circumference)
    expect(segments[2].start + segments[2].length).toBeCloseTo(circumference)
  })

  it('빈 입력은 빈 배열이다', () => {
    expect(donutSegments([], circumference)).toEqual([])
  })
})

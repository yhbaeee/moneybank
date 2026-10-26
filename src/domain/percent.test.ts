import { describe, expect, it } from 'vitest'
import { PERMILLE_TOTAL, allocatePermille, formatPermille } from './percent'

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

describe('allocatePermille', () => {
  it('딱 나누어떨어지면 그대로 계산한다', () => {
    expect(allocatePermille([20000, 5000])).toEqual([800, 200])
    expect(allocatePermille([100])).toEqual([1000])
  })

  it('3등분은 앞선 항목부터 남는 1‰를 받아 합이 1000이 된다', () => {
    expect(allocatePermille([1000, 1000, 1000])).toEqual([334, 333, 333])
  })

  it('나머지가 큰 항목이 먼저 남는 몫을 받는다', () => {
    // 2/3 = 666.67, 1/3 = 333.33 → 667, 333
    expect(allocatePermille([2, 1])).toEqual([667, 333])
    // 입력 순서가 달라도 같은 항목이 받는다
    expect(allocatePermille([1, 2])).toEqual([333, 667])
  })

  it('나머지가 같으면 금액이 큰 항목이, 그다음은 앞선 항목이 먼저 받는다', () => {
    // 합계 6: 나머지가 모두 4로 같고 남는 몫은 2‰ → 금액이 큰 4가 먼저, 그다음 첫 번째 1
    expect(allocatePermille([1, 4, 1])).toEqual([167, 667, 166])
  })

  it('아주 작은 항목도 합계를 깨지 않는다', () => {
    const result = allocatePermille([9_999_999_999, 1])
    expect(sum(result)).toBe(PERMILLE_TOTAL)
    expect(result).toEqual([1000, 0])
  })

  it('합계가 0이면 모두 0이다', () => {
    expect(allocatePermille([0, 0])).toEqual([0, 0])
    expect(allocatePermille([])).toEqual([])
  })

  it('임의의 입력에서도 항상 합이 1000이고 값이 음수가 아니다', () => {
    let seed = 12345
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed
    }
    for (let round = 0; round < 200; round++) {
      const length = (random() % 12) + 1
      const amounts = Array.from({ length }, () => (random() % 1_000_000) + 1)
      const result = allocatePermille(amounts)
      expect(sum(result)).toBe(PERMILLE_TOTAL)
      expect(result.every((value) => value >= 0)).toBe(true)
    }
  })

  it('큰 금액에서도 정수 오차 없이 합이 1000이다', () => {
    const result = allocatePermille([9_999_999_999, 9_999_999_999, 9_999_999_999])
    expect(result).toEqual([334, 333, 333])
  })

  it('음수나 정수가 아닌 값은 거부한다', () => {
    expect(() => allocatePermille([-1, 2])).toThrow(RangeError)
    expect(() => allocatePermille([1.5])).toThrow(RangeError)
  })
})

describe('formatPermille', () => {
  it('소수 첫째 자리까지 표시한다', () => {
    expect(formatPermille(1000)).toBe('100.0%')
    expect(formatPermille(334)).toBe('33.4%')
    expect(formatPermille(5)).toBe('0.5%')
    expect(formatPermille(0)).toBe('0.0%')
  })
})

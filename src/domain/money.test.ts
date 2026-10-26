import { describe, expect, it } from 'vitest'
import { MAX_AMOUNT, formatAmountDigits, formatSignedWon, formatWon, isValidAmount, parseAmountInput, sumAmounts } from './money'

describe('parseAmountInput', () => {
  it.each([
    ['12000', 12000],
    ['12,000', 12000],
    ['  5000  ', 5000],
    ['1', 1],
    ['00012', 12],
    ['9,999,999,999', MAX_AMOUNT],
  ])('%s → %d', (text, expected) => {
    expect(parseAmountInput(text)).toEqual({ ok: true, value: expected })
  })

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['abc', 'invalid'],
    ['1.5', 'invalid'],
    ['-100', 'invalid'],
    ['1e3', 'invalid'],
    ['1,00', 'invalid'],
    ['12원', 'invalid'],
    ['0', 'non-positive'],
    ['000', 'non-positive'],
    ['10,000,000,000', 'too-large'],
    ['9'.repeat(30), 'too-large'],
  ])('"%s"는 %s로 거부한다', (text, reason) => {
    expect(parseAmountInput(text)).toEqual({ ok: false, reason })
  })
})

describe('isValidAmount', () => {
  it('1 이상 한도 이하의 정수만 허용한다', () => {
    expect(isValidAmount(1)).toBe(true)
    expect(isValidAmount(MAX_AMOUNT)).toBe(true)
    expect(isValidAmount(0)).toBe(false)
    expect(isValidAmount(-1)).toBe(false)
    expect(isValidAmount(1.5)).toBe(false)
    expect(isValidAmount(MAX_AMOUNT + 1)).toBe(false)
    expect(isValidAmount(NaN)).toBe(false)
    expect(isValidAmount('100')).toBe(false)
  })
})

describe('formatWon', () => {
  it('천 단위 구분과 원 단위를 붙인다', () => {
    expect(formatWon(12000)).toBe('12,000원')
    expect(formatWon(0)).toBe('0원')
    expect(formatWon(1234567)).toBe('1,234,567원')
  })

  it('음수(잔액)도 표시한다', () => {
    expect(formatWon(-5000)).toBe('-5,000원')
  })
})

describe('sumAmounts', () => {
  it('정수 합계를 오차 없이 계산한다', () => {
    expect(sumAmounts([])).toBe(0)
    expect(sumAmounts([1000, 2500, 300])).toBe(3800)
  })

  it('정수가 아닌 값이나 안전 범위 초과는 오류를 던진다', () => {
    expect(() => sumAmounts([1.5])).toThrow(RangeError)
    expect(() => sumAmounts([Number.MAX_SAFE_INTEGER, 1])).toThrow(RangeError)
  })
})

describe('formatAmountDigits / formatSignedWon', () => {
  it('쉼표 구분 숫자를 만든다', () => {
    expect(formatAmountDigits(1234567)).toBe('1,234,567')
  })

  it('수입은 +, 지출은 - 부호를 붙인다', () => {
    expect(formatSignedWon(12000, 'expense')).toBe('-12,000원')
    expect(formatSignedWon(3000000, 'income')).toBe('+3,000,000원')
  })
})

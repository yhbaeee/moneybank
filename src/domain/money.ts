/** 허용 최대 금액: 100억 원 미만 */
export const MAX_AMOUNT = 9_999_999_999

/** MAX_AMOUNT의 자릿수. 이보다 길면 Number 변환 전에 한도 초과로 판단한다. */
const MAX_DIGITS = String(MAX_AMOUNT).length

export type AmountParseFailure = 'empty' | 'invalid' | 'non-positive' | 'too-large'

export type AmountParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: AmountParseFailure }

/** 1 이상 MAX_AMOUNT 이하의 안전한 정수인지 검사한다. */
export function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= MAX_AMOUNT
}

const PLAIN_DIGITS = /^\d+$/
const GROUPED_DIGITS = /^\d{1,3}(,\d{3})+$/

/** 입력창 문자열(쉼표 허용)을 정수 원으로 변환한다. 소수·음수·지수 표기는 거부한다. */
export function parseAmountInput(text: string): AmountParseResult {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: false, reason: 'empty' }
  if (!PLAIN_DIGITS.test(trimmed) && !GROUPED_DIGITS.test(trimmed)) return { ok: false, reason: 'invalid' }

  const digits = trimmed.replaceAll(',', '').replace(/^0+(?=\d)/, '')
  if (digits.length > MAX_DIGITS) return { ok: false, reason: 'too-large' }
  const value = Number(digits)
  if (value === 0) return { ok: false, reason: 'non-positive' }
  if (value > MAX_AMOUNT) return { ok: false, reason: 'too-large' }
  return { ok: true, value }
}

const wonFormat = new Intl.NumberFormat('ko-KR')

/** 12000 → "12,000원". 잔액처럼 음수도 허용한다. */
export function formatWon(value: number): string {
  return `${wonFormat.format(value)}원`
}

/** 입력창에 채울 쉼표 구분 숫자(원 표기 없음). 12000 → "12,000" */
export function formatAmountDigits(value: number): string {
  return wonFormat.format(value)
}

/** 수입은 "+", 지출은 "-"를 붙인 표기. 색상에만 의존하지 않기 위한 부호 병행 표기. */
export function formatSignedWon(amount: number, type: 'expense' | 'income'): string {
  return `${type === 'income' ? '+' : '-'}${formatWon(amount)}`
}

/** 정수 금액의 합계. 정수가 아니거나 안전 범위를 넘으면 오류를 던진다. */
export function sumAmounts(values: readonly number[]): number {
  let total = 0
  for (const value of values) {
    if (!Number.isSafeInteger(value)) throw new RangeError(`정수가 아닌 금액: ${value}`)
    total += value
    if (!Number.isSafeInteger(total)) throw new RangeError('금액 합계가 안전 범위를 초과했습니다.')
  }
  return total
}

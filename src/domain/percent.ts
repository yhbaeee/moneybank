import { sumAmounts } from './money'

/** 비율은 ‰(천분율) 정수로 다룬다. 전체는 항상 1000 = 100.0%. */
export const PERMILLE_TOTAL = 1000

/**
 * 금액 배열을 합이 정확히 1000‰인 정수 비율로 바꾼다(최대잔여법).
 * 1) 각 금액의 비율을 소수점 없이 버림 계산하고, 2) 모자란 만큼을 나머지가 큰 항목부터 1‰씩 나눠 준다.
 * 나머지가 같으면 금액이 큰 쪽, 그다음은 입력 순서가 앞선 쪽이 먼저 받아 결과가 항상 같다.
 * 부동소수점 대신 BigInt로 계산해 큰 금액에서도 오차가 없다. 합계가 0이면 모두 0이다.
 */
export function allocatePermille(amounts: readonly number[]): number[] {
  if (amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0)) {
    throw new RangeError('비율 계산에는 0 이상의 정수 금액만 사용할 수 있습니다.')
  }
  const total = sumAmounts(amounts)
  if (total === 0) return amounts.map(() => 0)

  const bigTotal = BigInt(total)
  const entries = amounts.map((amount, index) => {
    const scaled = BigInt(amount) * BigInt(PERMILLE_TOTAL)
    return { index, amount, permille: Number(scaled / bigTotal), remainder: scaled % bigTotal }
  })

  const leftover = PERMILLE_TOTAL - entries.reduce((sum, entry) => sum + entry.permille, 0)
  const byPriority = [...entries].sort((a, b) => {
    if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1
    return b.amount - a.amount || a.index - b.index
  })
  for (const entry of byPriority.slice(0, leftover)) entry.permille += 1

  return entries.map((entry) => entry.permille)
}

/** 334 → "33.4%" (정수 연산만 사용) */
export function formatPermille(permille: number): string {
  return `${Math.floor(permille / 10)}.${permille % 10}%`
}

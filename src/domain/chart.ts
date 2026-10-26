/** 차트 표시용 수학 함수. 화면에 그릴 눈금·길이만 다루며 금액 집계에는 쓰지 않는다. */

export interface NiceScale {
  /** y축 최댓값(step의 배수, 입력 max 이상) */
  max: number
  step: number
  /** 0부터 max까지 step 간격의 눈금 */
  ticks: number[]
}

const TARGET_INTERVALS = 4

/**
 * 0~max 범위를 보기 좋은 눈금(1·2·5 × 10^n 간격)으로 나눈다. 금액은 정수이므로 간격은 1 이상이다.
 * 예) 25,000 → 간격 10,000, 최댓값 30,000
 */
export function niceScale(max: number): NiceScale {
  if (!Number.isFinite(max) || max <= 0) return { max: 0, step: 1, ticks: [0] }

  const rawStep = max / TARGET_INTERVALS
  let magnitude = 1
  while (magnitude * 10 <= rawStep) magnitude *= 10

  const residual = rawStep / magnitude
  const niceFactor = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10
  const step = niceFactor * magnitude
  const niceMax = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let tick = 0; tick <= niceMax; tick += step) ticks.push(tick)
  return { max: niceMax, step, ticks }
}

/** 축 라벨용 축약 표기(0 이상). 5,000 / 2.5만 / 300만 / 1.2억 */
export function formatCompactWon(value: number): string {
  if (value < 10_000) return value.toLocaleString('ko-KR')

  const manTenths = Math.round(value / 1_000) // 만 단위의 0.1 배수
  if (manTenths < 100_000) return `${formatTenths(manTenths)}만`

  return `${formatTenths(Math.round(value / 10_000_000))}억`
}

function formatTenths(tenths: number): string {
  const whole = Math.floor(tenths / 10)
  const fraction = tenths % 10
  return fraction === 0 ? whole.toLocaleString('ko-KR') : `${whole.toLocaleString('ko-KR')}.${fraction}`
}

export interface DonutSegment {
  /** 호의 길이 */
  length: number
  /** 시작 위치(둘레 기준 누적 길이) */
  start: number
}

/** 비율(‰) 배열을 도넛 호 길이와 시작 위치로 바꾼다. 합이 1000이면 호 길이의 합은 둘레와 같다. */
export function donutSegments(permilles: readonly number[], circumference: number): DonutSegment[] {
  let cumulative = 0
  return permilles.map((permille) => {
    const segment = { length: (circumference * permille) / 1000, start: (circumference * cumulative) / 1000 }
    cumulative += permille
    return segment
  })
}

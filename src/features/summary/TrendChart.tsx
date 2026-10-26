import { EmptyState } from '../../components/EmptyState'
import { formatCompactWon, niceScale } from '../../domain/chart'
import { formatWon } from '../../domain/money'
import type { MonthlyTotal } from '../../domain/trend'
import type { MonthString } from '../../domain/types'

interface TrendChartProps {
  /** 오래된 달 → 최근 달 */
  data: MonthlyTotal[]
  /** 강조해서 표시할 달(보통 마지막 달) */
  selectedMonth: MonthString
}

const WIDTH = 360
const HEIGHT = 210
const MARGIN = { top: 12, right: 8, bottom: 40, left: 46 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const MIN_BAR_HEIGHT = 1.5
const MAX_BAR_WIDTH = 24

const yearOf = (month: MonthString) => Number(month.slice(0, 4))
const monthNumberOf = (month: MonthString) => Number(month.slice(5, 7))

/** 표에서 쓰는 월 표기. "2026.10" (화면 제목 "2026년 10월"과 구분된다) */
const tableMonth = (month: MonthString) => `${yearOf(month)}.${String(monthNumberOf(month)).padStart(2, '0')}`

/**
 * 최근 몇 달의 월별 수입(왼쪽)·지출(오른쪽) 묶음 막대 차트.
 * 색에만 의존하지 않도록 범례 글자와 "표로 보기"(수입·지출·잔액 표)를 함께 제공한다.
 */
export function TrendChart({ data, selectedMonth }: TrendChartProps) {
  const maxValue = Math.max(0, ...data.flatMap((item) => [item.income, item.expense]))
  if (maxValue === 0) {
    return <EmptyState title="최근 6개월간 내역이 없습니다" />
  }

  const scale = niceScale(maxValue)
  const groupWidth = PLOT_WIDTH / data.length
  const barWidth = Math.min(groupWidth * 0.3, MAX_BAR_WIDTH)
  const baseline = MARGIN.top + PLOT_HEIGHT
  const yOf = (value: number) => baseline - (value / scale.max) * PLOT_HEIGHT
  const barHeight = (value: number) => (value === 0 ? 0 : Math.max((value / scale.max) * PLOT_HEIGHT, MIN_BAR_HEIGHT))

  const first = data[0].month
  const last = data[data.length - 1].month
  const label = `${yearOf(first)}년 ${monthNumberOf(first)}월부터 ${yearOf(last)}년 ${monthNumberOf(last)}월까지 월별 수입·지출 막대 차트. 수치는 아래 '표로 보기'에서 확인할 수 있습니다.`

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex gap-4 text-sm">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm bg-income" />
          수입
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm bg-expense" />
          지출
        </li>
      </ul>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="mx-auto w-full max-w-lg">
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={yOf(tick)}
              y2={yOf(tick)}
              strokeWidth={1}
              className="stroke-line"
            />
            <text x={MARGIN.left - 6} y={yOf(tick) + 3} textAnchor="end" fontSize="9" className="fill-muted">
              {formatCompactWon(tick)}
            </text>
          </g>
        ))}

        {data.map((item, index) => {
          const center = MARGIN.left + groupWidth * index + groupWidth / 2
          const selected = item.month === selectedMonth
          const showYear = index === 0 || monthNumberOf(item.month) === 1
          const label = `${monthNumberOf(item.month)}월`
          return (
            <g key={item.month} data-month={item.month} data-selected={selected || undefined}>
              {selected && (
                <rect
                  x={MARGIN.left + groupWidth * index + 2}
                  y={MARGIN.top}
                  width={groupWidth - 4}
                  height={PLOT_HEIGHT}
                  rx={4}
                  className="fill-primary-soft"
                />
              )}
              <rect
                data-series="income"
                x={center - barWidth - 1}
                y={baseline - barHeight(item.income)}
                width={barWidth}
                height={barHeight(item.income)}
                rx={2}
                className="fill-income"
              >
                <title>{`${label} 수입 ${formatWon(item.income)}`}</title>
              </rect>
              <rect
                data-series="expense"
                x={center + 1}
                y={baseline - barHeight(item.expense)}
                width={barWidth}
                height={barHeight(item.expense)}
                rx={2}
                className="fill-expense"
              >
                <title>{`${label} 지출 ${formatWon(item.expense)}`}</title>
              </rect>
              <text
                x={center}
                y={baseline + 14}
                textAnchor="middle"
                fontSize="10"
                fontWeight={selected ? 700 : 400}
                className={selected ? 'fill-fg' : 'fill-muted'}
              >
                {label}
                {showYear && (
                  <tspan x={center} dy={12} fontSize="9" fontWeight={400} className="fill-muted">
                    {yearOf(item.month)}
                  </tspan>
                )}
              </text>
            </g>
          )
        })}
      </svg>

      <details>
        <summary className="cursor-pointer text-sm font-medium text-primary underline">표로 보기</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-right text-sm tabular-nums">
            <caption className="sr-only">최근 6개월 수입·지출</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="py-1 pr-3 text-left font-medium">
                  월
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  수입
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  지출
                </th>
                <th scope="col" className="py-1 font-medium">
                  잔액
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.month} className="border-b border-line last:border-0">
                  <th scope="row" className="py-1 pr-3 text-left font-medium">
                    {tableMonth(item.month)}
                  </th>
                  <td className="py-1 pr-3">{formatWon(item.income)}</td>
                  <td className="py-1 pr-3">{formatWon(item.expense)}</td>
                  <td className="py-1">{formatWon(item.income - item.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

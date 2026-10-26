import { donutSegments, formatCompactWon } from '../../domain/chart'
import { formatWon } from '../../domain/money'
import { formatPermille } from '../../domain/percent'
import type { CategoryShare } from '../../domain/summary'
import { DONUT } from './donutGeometry'

interface DonutChartProps {
  shares: CategoryShare[]
  /** 지출 합계(도넛 가운데에 축약해서 표시) */
  total: number
}

/**
 * 카테고리별 지출 비중 도넛. 호 길이는 합이 1000‰로 보정된 비율에서 계산한다.
 * 이미지로만 전달되지 않도록 aria-label에 수치를 담고, 옆의 카테고리 목록이 텍스트 대체 역할을 한다.
 */
export function DonutChart({ shares, total }: DonutChartProps) {
  const segments = donutSegments(
    shares.map((share) => share.permille),
    DONUT.circumference,
  )
  const label = `카테고리별 지출 비율 도넛 차트: ${shares
    .map((share) => `${share.name} ${formatPermille(share.permille)}`)
    .join(', ')}`

  return (
    <svg
      viewBox={`0 0 ${DONUT.size} ${DONUT.size}`}
      role="img"
      aria-label={label}
      className="mx-auto w-full max-w-[220px]"
    >
      {/* 12시 방향에서 시작하도록 회전한다. */}
      <g transform={`rotate(-90 ${DONUT.center} ${DONUT.center})`}>
        <circle
          cx={DONUT.center}
          cy={DONUT.center}
          r={DONUT.radius}
          fill="none"
          strokeWidth={DONUT.stroke}
          className="stroke-primary-soft"
        />
        {shares.map((share, index) => (
          <circle
            key={share.categoryId}
            data-category={share.categoryId}
            cx={DONUT.center}
            cy={DONUT.center}
            r={DONUT.radius}
            fill="none"
            stroke={share.color}
            strokeWidth={DONUT.stroke}
            strokeDasharray={`${segments[index].length} ${DONUT.circumference - segments[index].length}`}
            strokeDashoffset={-segments[index].start}
          >
            <title>{`${share.name} ${formatWon(share.amount)} (${formatPermille(share.permille)})`}</title>
          </circle>
        ))}
      </g>
      <text x={DONUT.center} y={DONUT.center - 4} textAnchor="middle" fontSize="8" className="fill-muted">
        지출
      </text>
      <text x={DONUT.center} y={DONUT.center + 9} textAnchor="middle" fontSize="11" fontWeight="700" className="fill-fg">
        {formatCompactWon(total)}원
      </text>
    </svg>
  )
}

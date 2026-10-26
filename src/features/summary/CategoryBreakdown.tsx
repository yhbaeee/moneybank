import { EmptyState } from '../../components/EmptyState'
import { formatWon } from '../../domain/money'
import { formatPermille } from '../../domain/percent'
import type { CategoryShare } from '../../domain/summary'

export function CategoryBreakdown({ shares }: { shares: CategoryShare[] }) {
  if (shares.length === 0) {
    return <EmptyState title="이 달의 지출 내역이 없습니다" />
  }

  return (
    <ul aria-label="카테고리별 지출" className="flex flex-col gap-3">
      {shares.map((share) => (
        <li key={share.categoryId} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 font-medium">
              <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: share.color }} />
              <span className="truncate">{share.name}</span>
            </span>
            <span className="shrink-0 text-sm tabular-nums">
              <span className="font-semibold">{formatWon(share.amount)}</span>
              <span className="ml-2 text-muted">{formatPermille(share.permille)}</span>
            </span>
          </div>
          {/* 막대는 보조 시각 요소다. 같은 정보를 위의 수치 텍스트가 제공한다. */}
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-primary-soft">
            <div className="h-full rounded-full" style={{ width: `${share.permille / 10}%`, backgroundColor: share.color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

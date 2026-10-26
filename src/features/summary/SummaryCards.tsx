import { Card } from '../../components/Card'
import { formatWon } from '../../domain/money'
import type { MonthSummary } from '../../domain/summary'

interface SummaryCardProps {
  label: string
  value: string
  valueClassName?: string
  className?: string
}

function SummaryCard({ label, value, valueClassName = '', className = '' }: SummaryCardProps) {
  return (
    <Card role="group" aria-label={label} className={`flex flex-col gap-1 ${className}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${valueClassName}`}>{value}</p>
    </Card>
  )
}

export function SummaryCards({ summary }: { summary: MonthSummary }) {
  const balanceClass = summary.balance < 0 ? 'text-expense' : ''
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <SummaryCard label="수입" value={formatWon(summary.income)} valueClassName="text-income" />
      <SummaryCard label="지출" value={formatWon(summary.expense)} valueClassName="text-expense" />
      <SummaryCard
        label="잔액"
        value={formatWon(summary.balance)}
        valueClassName={balanceClass}
        className="col-span-2 sm:col-span-1"
      />
    </div>
  )
}

import { useMemo } from 'react'
import { Badge } from '../../components/Badge'
import { formatKoreanDate } from '../../domain/date'
import { formatSignedWon } from '../../domain/money'
import type { Category, DateString, PaymentMethod, Transaction } from '../../domain/types'

interface TransactionListProps {
  /** 날짜 내림차순으로 정렬된 내역 */
  transactions: Transaction[]
  categories: Category[]
  paymentMethods: PaymentMethod[]
  onSelect: (transaction: Transaction) => void
  /** 날짜 제목의 헤딩 레벨. 페이지 구조에 맞춰 조정한다. */
  dateHeadingLevel?: 2 | 3
}

interface DateGroup {
  date: DateString
  items: Transaction[]
}

function groupByDate(transactions: Transaction[]): DateGroup[] {
  const groups: DateGroup[] = []
  for (const transaction of transactions) {
    const last = groups[groups.length - 1]
    if (last && last.date === transaction.date) last.items.push(transaction)
    else groups.push({ date: transaction.date, items: [transaction] })
  }
  return groups
}

export function TransactionList({
  transactions,
  categories,
  paymentMethods,
  onSelect,
  dateHeadingLevel = 2,
}: TransactionListProps) {
  const DateHeading = dateHeadingLevel === 3 ? 'h3' : 'h2'
  const groups = useMemo(() => groupByDate(transactions), [transactions])
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const paymentById = useMemo(() => new Map(paymentMethods.map((p) => [p.id, p])), [paymentMethods])

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.date} aria-label={formatKoreanDate(group.date)}>
          <DateHeading className="mb-1 text-sm font-medium text-muted">{formatKoreanDate(group.date)}</DateHeading>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {group.items.map((transaction) => {
              const category = categoryById.get(transaction.categoryId)
              const payment = paymentById.get(transaction.paymentMethodId)
              return (
                <li key={transaction.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(transaction)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-primary-soft"
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          aria-hidden="true"
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: category?.color ?? '#64748b' }}
                        />
                        {category?.name ?? '(삭제된 카테고리)'}
                      </span>
                      {(transaction.memo || transaction.tags.length > 0 || payment) && (
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                          {payment && <span>{payment.name}</span>}
                          {transaction.memo && <span className="truncate">{transaction.memo}</span>}
                          {transaction.tags.map((tag) => (
                            <Badge key={tag}>#{tag}</Badge>
                          ))}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 font-semibold tabular-nums ${
                        transaction.type === 'income' ? 'text-income' : 'text-expense'
                      }`}
                    >
                      {formatSignedWon(transaction.amount, transaction.type)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

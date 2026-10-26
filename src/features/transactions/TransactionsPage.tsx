import { useMemo, useState } from 'react'
import { useLedgerData } from '../../app/ledgerDataContext'
import { useSelectedMonth } from '../../app/selectedMonthContext'
import { useTransactionEditor } from '../../app/transactionEditorContext'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { MonthNavigator } from '../../components/MonthNavigator'
import { EMPTY_FILTERS, collectTags, filterTransactions, hasActiveFilters } from '../../domain/filter'
import { formatWon } from '../../domain/money'
import { summarizeTransactions, transactionsInMonth } from '../../domain/summary'
import { TransactionFilterBar } from './TransactionFilterBar'
import { TransactionList } from './TransactionList'

export function TransactionsPage() {
  const { transactions, categories, paymentMethods } = useLedgerData()
  const { month, setMonth } = useSelectedMonth()
  const { openCreate, openEdit } = useTransactionEditor()
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const monthTransactions = useMemo(() => transactionsInMonth(transactions, month), [transactions, month])
  const tags = useMemo(() => collectTags(monthTransactions), [monthTransactions])
  const visible = useMemo(
    () => filterTransactions(monthTransactions, filters, categories),
    [monthTransactions, filters, categories],
  )
  const totals = useMemo(() => summarizeTransactions(visible), [visible])

  return (
    <section aria-labelledby="transactions-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 id="transactions-title" className="text-xl font-bold">
          내역
        </h1>
        {/* 모바일에서는 하단의 떠 있는 버튼(FAB)을 쓰므로 데스크톱에서만 보인다. */}
        <div className="hidden md:block">
          <Button onClick={openCreate}>내역 추가</Button>
        </div>
      </div>

      <MonthNavigator month={month} onChange={setMonth} />

      {(monthTransactions.length > 0 || hasActiveFilters(filters)) && (
        <TransactionFilterBar
          filters={filters}
          onChange={setFilters}
          categories={categories}
          paymentMethods={paymentMethods}
          tags={tags}
        />
      )}

      {monthTransactions.length === 0 ? (
        <EmptyState title="이 달의 내역이 없습니다" description="'내역 추가' 버튼으로 내역을 등록해 보세요." />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted">
            {visible.length}건 · 수입 {formatWon(totals.income)} · 지출 {formatWon(totals.expense)}
          </p>
          {visible.length === 0 ? (
            <EmptyState
              title="조건에 맞는 내역이 없습니다"
              action={
                hasActiveFilters(filters) ? (
                  <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                    필터 초기화
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <TransactionList
              transactions={visible}
              categories={categories}
              paymentMethods={paymentMethods}
              onSelect={openEdit}
            />
          )}
        </>
      )}
    </section>
  )
}

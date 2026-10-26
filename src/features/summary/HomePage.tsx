import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLedgerData } from '../../app/ledgerDataContext'
import { useSelectedMonth } from '../../app/selectedMonthContext'
import { useTransactionEditor } from '../../app/transactionEditorContext'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { MonthNavigator } from '../../components/MonthNavigator'
import { aggregateExpensesByCategory, summarizeMonth, transactionsInMonth } from '../../domain/summary'
import { TransactionList } from '../transactions/TransactionList'
import { CategoryBreakdown } from './CategoryBreakdown'
import { SummaryCards } from './SummaryCards'

const RECENT_COUNT = 5

export function HomePage() {
  const { transactions, categories, paymentMethods } = useLedgerData()
  const { month, setMonth } = useSelectedMonth()
  const { openCreate, openEdit } = useTransactionEditor()

  const summary = useMemo(() => summarizeMonth(transactions, month), [transactions, month])
  const shares = useMemo(
    () => aggregateExpensesByCategory(transactions, categories, month),
    [transactions, categories, month],
  )
  const recent = useMemo(
    () => transactionsInMonth(transactions, month).slice(0, RECENT_COUNT),
    [transactions, month],
  )

  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 id="home-title" className="text-xl font-bold">
          홈
        </h1>
        {/* 모바일에서는 하단의 떠 있는 버튼(FAB)을 쓰므로 데스크톱에서만 보인다. */}
        <div className="hidden md:block">
          <Button onClick={openCreate}>내역 추가</Button>
        </div>
      </div>

      <MonthNavigator month={month} onChange={setMonth} />

      <SummaryCards summary={summary} />

      <section aria-labelledby="breakdown-title" className="flex flex-col gap-3">
        <h2 id="breakdown-title" className="text-lg font-bold">
          카테고리별 지출
        </h2>
        <CategoryBreakdown shares={shares} />
      </section>

      <section aria-labelledby="recent-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-title" className="text-lg font-bold">
            최근 내역
          </h2>
          <Link to="/transactions" className="text-sm font-medium text-primary underline">
            전체 보기
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="이 달의 내역이 없습니다" description="'내역 추가' 버튼으로 내역을 등록해 보세요." />
        ) : (
          <TransactionList
            transactions={recent}
            categories={categories}
            paymentMethods={paymentMethods}
            onSelect={openEdit}
            dateHeadingLevel={3}
          />
        )}
      </section>
    </section>
  )
}

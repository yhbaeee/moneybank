import { useEffect, useMemo, useRef, useState } from 'react'
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

/** 한 번에 그리는 행 수. 대부분의 달은 이보다 적어 "더 보기"가 나타나지 않는다. */
const PAGE_SIZE = 100

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

  // 월이나 필터가 바뀌면 처음 100건부터 다시 보여 준다. 이전 상태로 되돌아와도 늘어난 개수를 이어받지 않도록
  // 렌더링 중에 파생 상태를 초기화한다(React가 즉시 다시 렌더링한다).
  const resetKey = `${month}|${JSON.stringify(filters)}`
  const [limit, setLimit] = useState({ key: resetKey, count: PAGE_SIZE })
  let shownCount = limit.count
  if (limit.key !== resetKey) {
    setLimit({ key: resetKey, count: PAGE_SIZE })
    shownCount = PAGE_SIZE
  }
  const shown = useMemo(() => visible.slice(0, shownCount), [visible, shownCount])
  const remaining = visible.length - shown.length

  // "더 보기"로 늘어난 행 중 첫 번째 새 행으로 포커스를 옮겨, 키보드·스크린리더 사용자가 이어서 읽게 한다.
  const listRef = useRef<HTMLDivElement>(null)
  const focusIndex = useRef<number | null>(null)
  useEffect(() => {
    if (focusIndex.current === null) return
    listRef.current?.querySelectorAll<HTMLElement>('li > button')[focusIndex.current]?.focus()
    focusIndex.current = null
  }, [shown.length])

  function showMore() {
    focusIndex.current = shown.length
    setLimit({ key: resetKey, count: shownCount + PAGE_SIZE })
  }

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
            <div ref={listRef} className="flex flex-col gap-4">
              <TransactionList
                transactions={shown}
                categories={categories}
                paymentMethods={paymentMethods}
                onSelect={openEdit}
              />
              {remaining > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <p aria-live="polite" className="text-sm text-muted">
                    {visible.length}건 중 {shown.length}건 표시
                  </p>
                  <Button variant="secondary" onClick={showMore}>
                    더 보기 ({remaining}건 남음)
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

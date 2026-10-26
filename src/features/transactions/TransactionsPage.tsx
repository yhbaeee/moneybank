import { useLedgerData } from '../../app/ledgerDataContext'
import { useTransactionEditor } from '../../app/transactionEditorContext'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { TransactionList } from './TransactionList'

export function TransactionsPage() {
  const { transactions, categories, paymentMethods } = useLedgerData()
  const { openCreate, openEdit } = useTransactionEditor()

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
      {transactions.length === 0 ? (
        <EmptyState title="아직 내역이 없습니다" description="'내역 추가' 버튼으로 첫 내역을 등록해 보세요." />
      ) : (
        <TransactionList
          transactions={transactions}
          categories={categories}
          paymentMethods={paymentMethods}
          onSelect={openEdit}
        />
      )}
    </section>
  )
}

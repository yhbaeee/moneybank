import { EmptyState } from '../../components/EmptyState'

export function TransactionsPage() {
  return (
    <section aria-labelledby="transactions-title" className="flex flex-col gap-4">
      <h1 id="transactions-title" className="text-xl font-bold">
        내역
      </h1>
      <EmptyState title="표시할 내역이 없습니다" description="내역 목록은 이후 단계에서 구현됩니다." />
    </section>
  )
}

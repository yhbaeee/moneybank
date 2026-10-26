import { useTransactionEditor } from '../../app/transactionEditorContext'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'

export function HomePage() {
  const { openCreate } = useTransactionEditor()

  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 id="home-title" className="text-xl font-bold">
          홈
        </h1>
        {/* 모바일에서는 하단의 떠 있는 버튼(FAB)을 쓰므로 데스크톱에서만 보인다. */}
        <div className="hidden md:block">
          <Button onClick={openCreate}>내역 추가</Button>
        </div>
      </div>
      <EmptyState title="월별 요약은 이후 단계에서 표시됩니다" description="내역은 '내역' 탭에서 확인할 수 있습니다." />
    </section>
  )
}

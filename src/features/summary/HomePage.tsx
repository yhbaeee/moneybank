import { EmptyState } from '../../components/EmptyState'

export function HomePage() {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-4">
      <h1 id="home-title" className="text-xl font-bold">
        홈
      </h1>
      <EmptyState title="아직 내역이 없습니다" description="내역을 추가하면 이곳에 월별 요약이 표시됩니다." />
    </section>
  )
}

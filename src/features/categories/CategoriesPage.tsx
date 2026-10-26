import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState'

export function CategoriesPage() {
  return (
    <section aria-labelledby="categories-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 id="categories-title" className="text-xl font-bold">
          카테고리 관리
        </h1>
        <Link to="/settings" className="text-sm text-primary underline">
          설정으로 돌아가기
        </Link>
      </div>
      <EmptyState title="카테고리 관리" description="이후 단계에서 구현됩니다." />
    </section>
  )
}

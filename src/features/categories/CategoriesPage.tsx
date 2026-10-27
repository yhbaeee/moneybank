import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLedgerData } from '../../app/ledgerDataContext'
import { useFocusHeadingIfLost } from '../../app/useFocusHeadingIfLost'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import type { Category, TransactionType } from '../../domain/types'
import { CategoryDeleteDialog } from './CategoryDeleteDialog'
import { CategoryForm, type CategoryFormState } from './CategoryForm'

const SECTIONS: { type: TransactionType; label: string }[] = [
  { type: 'expense', label: '지출' },
  { type: 'income', label: '수입' },
]

export function CategoriesPage() {
  const { categories, transactions } = useLedgerData()
  const [form, setForm] = useState<CategoryFormState>({ mode: 'closed' })
  const [deleting, setDeleting] = useState<Category | null>(null)

  useFocusHeadingIfLost(form.mode !== 'closed' || deleting !== null)

  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const transaction of transactions) {
      counts.set(transaction.categoryId, (counts.get(transaction.categoryId) ?? 0) + 1)
    }
    return counts
  }, [transactions])

  return (
    <section aria-labelledby="categories-title" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 id="categories-title" className="text-xl font-bold">
          카테고리 관리
        </h1>
        <Link to="/settings" className="inline-flex min-h-11 items-center text-sm text-primary underline">
          설정으로 돌아가기
        </Link>
      </div>

      {SECTIONS.map(({ type, label }) => {
        const items = categories.filter((category) => category.type === type)
        return (
          <section key={type} aria-labelledby={`${type}-categories-title`} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id={`${type}-categories-title`} className="text-lg font-bold">
                {label} 카테고리
              </h2>
              <Button variant="secondary" onClick={() => setForm({ mode: 'create', type })}>
                {label} 카테고리 추가
              </Button>
            </div>
            <ul aria-label={`${label} 카테고리 목록`} className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {items.map((category) => (
                <li key={category.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="break-all font-medium">{category.name}</span>
                    {category.isDefault && <Badge>기본</Badge>}
                    <span className="text-xs text-muted">{usage.get(category.id) ?? 0}건</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      aria-label={`${label} 카테고리 ${category.name} 수정`}
                      onClick={() => setForm({ mode: 'edit', category })}
                    >
                      수정
                    </Button>
                    {category.isProtected ? (
                      <span className="px-2 text-xs text-muted">삭제 불가</span>
                    ) : (
                      <Button
                        variant="ghost"
                        aria-label={`${label} 카테고리 ${category.name} 삭제`}
                        onClick={() => setDeleting(category)}
                      >
                        삭제
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <CategoryForm state={form} onClose={() => setForm({ mode: 'closed' })} />
      <CategoryDeleteDialog
        category={deleting}
        usageCount={deleting ? (usage.get(deleting.id) ?? 0) : 0}
        onClose={() => setDeleting(null)}
      />
    </section>
  )
}

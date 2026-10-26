import { useId, useState } from 'react'
import { Button } from '../../components/Button'
import { Input, Select } from '../../components/Field'
import { countSelectFilters, hasActiveFilters, EMPTY_FILTERS, type TransactionFilters, type TypeFilter } from '../../domain/filter'
import type { Category, PaymentMethod } from '../../domain/types'

interface TransactionFilterBarProps {
  filters: TransactionFilters
  onChange: (filters: TransactionFilters) => void
  categories: Category[]
  paymentMethods: PaymentMethod[]
  /** 태그 선택지(현재 월의 태그) */
  tags: string[]
}

const TYPE_LABELS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'expense', label: '지출' },
  { value: 'income', label: '수입' },
]

/** 검색창은 항상 보이고, 나머지 필터는 모바일에서 "필터" 버튼으로 접었다 편다(데스크톱은 항상 펼침). */
export function TransactionFilterBar({ filters, onChange, categories, paymentMethods, tags }: TransactionFilterBarProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const selectCount = countSelectFilters(filters)

  function changeType(type: TypeFilter) {
    const selected = categories.find((category) => category.id === filters.categoryId)
    // 유형과 맞지 않는 카테고리 선택은 해제해 항상 결과가 비는 조합을 막는다.
    const keepCategory = !selected || type === 'all' || selected.type === type
    onChange({ ...filters, type, categoryId: keepCategory ? filters.categoryId : '' })
  }

  const expenseCategories = categories.filter((category) => category.type === 'expense')
  const incomeCategories = categories.filter((category) => category.type === 'income')
  // 현재 선택한 태그가 이 달에 없더라도 선택지에서 사라지지 않게 포함한다.
  const tagOptions = filters.tag !== '' && !tags.includes(filters.tag) ? [filters.tag, ...tags] : tags

  return (
    <section aria-label="내역 필터" className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="검색"
            type="search"
            autoComplete="off"
            placeholder="메모, 태그, 카테고리"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
          />
        </div>
        <Button
          variant="secondary"
          className="md:hidden"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
        >
          {selectCount > 0 ? `필터 (${selectCount})` : '필터'}
        </Button>
      </div>

      <div id={panelId} className={`${expanded ? 'grid' : 'hidden'} grid-cols-2 gap-3 md:grid md:grid-cols-4`}>
        <Select label="유형" value={filters.type} onChange={(e) => changeType(e.target.value as TypeFilter)}>
          {TYPE_LABELS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          label="카테고리"
          value={filters.categoryId}
          onChange={(e) => onChange({ ...filters, categoryId: e.target.value })}
        >
          <option value="">전체</option>
          {filters.type === 'all' ? (
            <>
              <optgroup label="지출">
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="수입">
                {incomeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            </>
          ) : (
            (filters.type === 'expense' ? expenseCategories : incomeCategories).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))
          )}
        </Select>
        <Select
          label="결제수단"
          value={filters.paymentMethodId}
          onChange={(e) => onChange({ ...filters, paymentMethodId: e.target.value })}
        >
          <option value="">전체</option>
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </Select>
        <Select label="태그" value={filters.tag} onChange={(e) => onChange({ ...filters, tag: e.target.value })}>
          <option value="">전체</option>
          {tagOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </Select>
      </div>

      {hasActiveFilters(filters) && (
        <div>
          <Button variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
            필터 초기화
          </Button>
        </div>
      )}
    </section>
  )
}

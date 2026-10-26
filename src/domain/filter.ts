import type { Category, Transaction, TransactionType } from './types'

export type TypeFilter = 'all' | TransactionType

export interface TransactionFilters {
  /** 검색어. 공백으로 나눈 단어가 모두 (메모·태그·카테고리명) 중 어딘가에 포함되어야 한다. */
  query: string
  type: TypeFilter
  /** 빈 문자열이면 전체 */
  categoryId: string
  /** 빈 문자열이면 전체 */
  paymentMethodId: string
  /** 빈 문자열이면 전체 */
  tag: string
}

export const EMPTY_FILTERS: TransactionFilters = {
  query: '',
  type: 'all',
  categoryId: '',
  paymentMethodId: '',
  tag: '',
}

/** 검색 입력(query)을 제외한 선택형 필터 중 활성인 개수 */
export function countSelectFilters(filters: TransactionFilters): number {
  return [filters.type !== 'all', filters.categoryId !== '', filters.paymentMethodId !== '', filters.tag !== ''].filter(
    Boolean,
  ).length
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return filters.query.trim() !== '' || countSelectFilters(filters) > 0
}

/** 한글 조합 형태(NFC/NFD) 차이와 대소문자를 무시하고 비교하기 위한 정규화 */
function normalizeText(text: string): string {
  return text.normalize('NFC').toLowerCase()
}

function searchTerms(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .map((term) => term.replace(/^#+/, ''))
    .filter((term) => term !== '')
}

/**
 * 거래를 필터링한다. 모든 조건은 AND로 결합하며, 입력 순서를 유지한다.
 * 검색은 메모·태그·카테고리명에 대한 부분 일치이고, 태그 필터는 대소문자 무시 완전 일치이다.
 */
export function filterTransactions(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
  categories: readonly Category[],
): Transaction[] {
  const terms = searchTerms(filters.query)
  const categoryNameById = new Map(categories.map((category) => [category.id, normalizeText(category.name)]))
  const tagFilter = filters.tag === '' ? null : normalizeText(filters.tag)

  return transactions.filter((transaction) => {
    if (filters.type !== 'all' && transaction.type !== filters.type) return false
    if (filters.categoryId !== '' && transaction.categoryId !== filters.categoryId) return false
    if (filters.paymentMethodId !== '' && transaction.paymentMethodId !== filters.paymentMethodId) return false
    if (tagFilter !== null && !transaction.tags.some((tag) => normalizeText(tag) === tagFilter)) return false

    if (terms.length > 0) {
      const haystack = [
        normalizeText(transaction.memo),
        ...transaction.tags.map(normalizeText),
        categoryNameById.get(transaction.categoryId) ?? '',
      ]
      if (!terms.every((term) => haystack.some((field) => field.includes(term)))) return false
    }
    return true
  })
}

/** 태그 필터 선택지: 대소문자 무시 중복 제거(먼저 나온 표기 유지), 가나다순 */
export function collectTags(transactions: readonly Transaction[]): string[] {
  const byKey = new Map<string, string>()
  for (const transaction of transactions) {
    for (const tag of transaction.tags) {
      const key = normalizeText(tag)
      if (!byKey.has(key)) byKey.set(key, tag)
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'ko'))
}

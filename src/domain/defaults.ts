import { CURRENT_SCHEMA_VERSION, type Category, type LedgerData, type Member, type PaymentMethod, type TransactionType } from './types'

export const DEFAULT_MEMBER_ID = 'member-me'

/** 카테고리 색상 팔레트(순서대로 배정). 차트에서 구분되도록 색상 계열을 분산했다. */
export const CATEGORY_COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#84cc16',
  '#ec4899',
  '#64748b',
] as const

const CATEGORY_COLOR_NAMES = ['인디고', '하늘', '청록', '주황', '빨강', '보라', '연두', '분홍', '회색'] as const

/** 카테고리 색 선택지(팔레트 색 + 한국어 이름). 색에만 의존하지 않도록 이름을 함께 제공한다. */
export const CATEGORY_COLOR_OPTIONS: { value: string; label: string }[] = CATEGORY_COLORS.map((value, index) => ({
  value,
  label: CATEGORY_COLOR_NAMES[index],
}))

/** 같은 유형에서 아직 쓰지 않은 팔레트 색을 먼저 고른다. 모두 쓰였으면 순환한다. */
export function pickCategoryColor(categories: readonly Category[], type: TransactionType): string {
  const used = new Set(categories.filter((category) => category.type === type).map((category) => category.color))
  const unused = CATEGORY_COLORS.find((color) => !used.has(color))
  if (unused) return unused
  const count = categories.filter((category) => category.type === type).length
  return CATEGORY_COLORS[count % CATEGORY_COLORS.length]
}

const EXPENSE_CATEGORY_NAMES = ['식비', '교통', '주거·통신', '쇼핑', '의료·건강', '문화·여가', '교육', '경조사', '기타']
const INCOME_CATEGORY_NAMES = ['급여', '부수입', '용돈', '기타']
const PROTECTED_CATEGORY_NAME = '기타'

const PAYMENT_METHOD_NAMES = ['현금', '체크카드', '신용카드', '계좌이체', '기타']

function createDefaultCategories(type: TransactionType, names: string[]): Category[] {
  return names.map((name, index) => ({
    id: `cat-${type}-${index + 1}`,
    name,
    type,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    isDefault: true,
    isProtected: name === PROTECTED_CATEGORY_NAME,
    sortOrder: index + 1,
  }))
}

/** 최초 실행 시 저장하는 기본 데이터. 호출할 때마다 새 객체를 만든다. */
export function createSeedData(): LedgerData {
  const members: Member[] = [{ id: DEFAULT_MEMBER_ID, name: '나' }]
  const paymentMethods: PaymentMethod[] = PAYMENT_METHOD_NAMES.map((name, index) => ({
    id: `pay-${index + 1}`,
    name,
    sortOrder: index + 1,
  }))

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    members,
    categories: [
      ...createDefaultCategories('expense', EXPENSE_CATEGORY_NAMES),
      ...createDefaultCategories('income', INCOME_CATEGORY_NAMES),
    ],
    paymentMethods,
    transactions: [],
  }
}

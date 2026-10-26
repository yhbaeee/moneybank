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

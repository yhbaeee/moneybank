/** 저장 데이터 스키마 버전. 구조가 바뀌면 올리고 storage/migrations.ts에 마이그레이션을 추가한다. */
export const CURRENT_SCHEMA_VERSION = 1

/** 시간대 없는 로컬 날짜 `YYYY-MM-DD`. date.ts의 함수로만 만든다. */
export type DateString = string & { readonly __brand: 'DateString' }

/** 로컬 월 `YYYY-MM`. date.ts의 함수로만 만든다. */
export type MonthString = string & { readonly __brand: 'MonthString' }

export type TransactionType = 'expense' | 'income'

export interface Member {
  id: string
  name: string
}

export interface Category {
  id: string
  name: string
  type: TransactionType
  /** 차트 표시용 색상(#rrggbb) */
  color: string
  isDefault: boolean
  /** true이면 삭제할 수 없다(유형별 '기타'). */
  isProtected: boolean
  sortOrder: number
}

export interface PaymentMethod {
  id: string
  name: string
  sortOrder: number
}

export interface Transaction {
  id: string
  type: TransactionType
  /** 1 이상의 정수 원. 부호는 type으로 표현한다. */
  amount: number
  date: DateString
  categoryId: string
  paymentMethodId: string
  memo: string
  tags: string[]
  ownerId: string
  /** ISO 8601 */
  createdAt: string
  updatedAt: string
}

/** 등록/수정 입력값. 검증 전 값이므로 date는 일반 문자열이다. */
export interface TransactionInput {
  type: TransactionType
  amount: number
  date: string
  categoryId: string
  paymentMethodId: string
  memo: string
  tags: string[]
  /** 생략하면 기본 구성원(수정 시에는 기존 소유자)을 사용한다. */
  ownerId?: string
}

export interface CategoryInput {
  name: string
  type: TransactionType
  color: string
}

export type CategoryPatch = Partial<Pick<CategoryInput, 'name' | 'color'>>

/** localStorage 문서와 백업 파일이 공유하는 데이터 전체. 테마는 기기 설정이라 포함하지 않는다. */
export interface LedgerData {
  schemaVersion: number
  members: Member[]
  categories: Category[]
  paymentMethods: PaymentMethod[]
  transactions: Transaction[]
}

import { createContext, useContext } from 'react'
import type {
  Category,
  CategoryInput,
  CategoryPatch,
  LedgerData,
  PaymentMethod,
  Transaction,
  TransactionInput,
} from '../domain/types'

/** 화면이 읽는 메모리 상의 데이터와, 저장 후 자동으로 갱신해 주는 변경 함수 모음. */
export interface LedgerDataValue {
  /** 날짜 내림차순 전체 내역 */
  transactions: Transaction[]
  categories: Category[]
  paymentMethods: PaymentMethod[]
  createTransaction: (input: TransactionInput) => Promise<Transaction>
  updateTransaction: (id: string, input: TransactionInput) => Promise<Transaction>
  removeTransaction: (id: string) => Promise<void>
  createCategory: (input: CategoryInput) => Promise<Category>
  updateCategory: (id: string, patch: CategoryPatch) => Promise<Category>
  /** 사용 중인 카테고리는 같은 유형의 reassignToId로 내역을 옮겨야 삭제할 수 있다. */
  removeCategory: (id: string, reassignToId?: string) => Promise<void>
  /** 저장된 데이터 전체(백업 내보내기용) */
  exportData: () => Promise<LedgerData>
  /** 검증 후 전체를 교체한다. 실패하면 기존 데이터는 그대로다. */
  importData: (data: LedgerData) => Promise<void>
  /** 모든 데이터를 지우고 기본 데이터로 되돌린다. */
  resetData: () => Promise<void>
}

export const LedgerDataContext = createContext<LedgerDataValue | null>(null)

export function useLedgerData(): LedgerDataValue {
  const value = useContext(LedgerDataContext)
  if (!value) throw new Error('useLedgerData는 LedgerDataProvider 안에서 사용해야 합니다.')
  return value
}

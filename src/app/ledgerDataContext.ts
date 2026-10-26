import { createContext, useContext } from 'react'
import type { Category, PaymentMethod, Transaction, TransactionInput } from '../domain/types'

/** 화면이 읽는 메모리 상의 데이터와, 저장 후 자동으로 갱신해 주는 변경 함수 모음. */
export interface LedgerDataValue {
  /** 날짜 내림차순 전체 내역 */
  transactions: Transaction[]
  categories: Category[]
  paymentMethods: PaymentMethod[]
  createTransaction: (input: TransactionInput) => Promise<Transaction>
  updateTransaction: (id: string, input: TransactionInput) => Promise<Transaction>
  removeTransaction: (id: string) => Promise<void>
}

export const LedgerDataContext = createContext<LedgerDataValue | null>(null)

export function useLedgerData(): LedgerDataValue {
  const value = useContext(LedgerDataContext)
  if (!value) throw new Error('useLedgerData는 LedgerDataProvider 안에서 사용해야 합니다.')
  return value
}

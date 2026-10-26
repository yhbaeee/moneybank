import { createContext, useContext } from 'react'
import type { Transaction } from '../domain/types'

export interface TransactionEditorValue {
  /** 새 내역 입력 폼을 연다. */
  openCreate: () => void
  /** 기존 내역 수정 폼을 연다. */
  openEdit: (transaction: Transaction) => void
}

export const TransactionEditorContext = createContext<TransactionEditorValue | null>(null)

export function useTransactionEditor(): TransactionEditorValue {
  const value = useContext(TransactionEditorContext)
  if (!value) throw new Error('useTransactionEditor는 TransactionEditorProvider 안에서 사용해야 합니다.')
  return value
}

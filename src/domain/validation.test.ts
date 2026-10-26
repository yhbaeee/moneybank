import { describe, expect, it } from 'vitest'
import type { TransactionInput } from './types'
import { MAX_MEMO_LENGTH, validateTransactionInput } from './validation'

const valid: TransactionInput = {
  type: 'expense',
  amount: 12000,
  date: '2026-10-27',
  categoryId: 'cat-expense-1',
  paymentMethodId: 'pay-1',
  memo: '점심',
  tags: ['외식'],
}

describe('validateTransactionInput', () => {
  it('올바른 입력은 오류가 없다', () => {
    expect(validateTransactionInput(valid)).toEqual({})
  })

  it.each([0, -1, 1.5, NaN, 10_000_000_000])('금액 %s는 거부한다', (amount) => {
    expect(validateTransactionInput({ ...valid, amount })).toHaveProperty('amount')
  })

  it('존재하지 않는 날짜는 거부한다', () => {
    expect(validateTransactionInput({ ...valid, date: '2026-02-30' })).toHaveProperty('date')
    expect(validateTransactionInput({ ...valid, date: '' })).toHaveProperty('date')
  })

  it('카테고리와 결제수단이 비어 있으면 거부한다', () => {
    const errors = validateTransactionInput({ ...valid, categoryId: '', paymentMethodId: '' })
    expect(errors).toHaveProperty('categoryId')
    expect(errors).toHaveProperty('paymentMethodId')
  })

  it('메모와 태그의 길이·개수 제한을 검사한다', () => {
    expect(validateTransactionInput({ ...valid, memo: 'a'.repeat(MAX_MEMO_LENGTH + 1) })).toHaveProperty('memo')
    expect(validateTransactionInput({ ...valid, tags: Array.from({ length: 11 }, (_, i) => `t${i}`) })).toHaveProperty('tags')
    expect(validateTransactionInput({ ...valid, tags: ['a'.repeat(21)] })).toHaveProperty('tags')
  })
})

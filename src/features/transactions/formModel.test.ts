import { describe, expect, it } from 'vitest'
import { createSeedData } from '../../domain/defaults'
import { asDateString } from '../../domain/date'
import type { Transaction } from '../../domain/types'
import {
  createEmptyFormValues,
  firstCategoryId,
  formValuesFromTransaction,
  toTransactionInput,
  type TransactionFormValues,
} from './formModel'

const seed = createSeedData()

const valid: TransactionFormValues = {
  type: 'expense',
  amount: '12,000',
  date: '2026-10-27',
  categoryId: 'cat-expense-1',
  paymentMethodId: 'pay-1',
  memo: '  점심  ',
  tags: '#외식, 회식 외식',
}

describe('createEmptyFormValues', () => {
  it('지출, 오늘 날짜, 첫 카테고리·결제수단으로 시작한다', () => {
    expect(createEmptyFormValues(seed.categories, seed.paymentMethods, asDateString('2026-10-27'))).toEqual({
      type: 'expense',
      amount: '',
      date: '2026-10-27',
      categoryId: 'cat-expense-1',
      paymentMethodId: 'pay-1',
      memo: '',
      tags: '',
    })
  })
})

describe('firstCategoryId', () => {
  it('유형에 맞는 첫 카테고리를 돌려준다', () => {
    expect(firstCategoryId(seed.categories, 'income')).toBe('cat-income-1')
    expect(firstCategoryId([], 'income')).toBe('')
  })
})

describe('toTransactionInput', () => {
  it('올바른 값은 정규화된 입력으로 변환한다', () => {
    expect(toTransactionInput(valid)).toEqual({
      ok: true,
      input: {
        type: 'expense',
        amount: 12000,
        date: '2026-10-27',
        categoryId: 'cat-expense-1',
        paymentMethodId: 'pay-1',
        memo: '점심',
        tags: ['외식', '회식'],
      },
    })
  })

  it.each([
    ['', '금액을 입력해 주세요.'],
    ['0', '금액은 1원 이상이어야 합니다.'],
    ['1.5', '금액은 숫자만 입력해 주세요. (소수·음수는 입력할 수 없습니다)'],
    ['-100', '금액은 숫자만 입력해 주세요. (소수·음수는 입력할 수 없습니다)'],
    ['abc', '금액은 숫자만 입력해 주세요. (소수·음수는 입력할 수 없습니다)'],
    ['10,000,000,000', '금액은 9,999,999,999원 이하로 입력해 주세요.'],
  ])('금액 "%s"는 "%s"로 거부한다', (amount, message) => {
    expect(toTransactionInput({ ...valid, amount })).toEqual({ ok: false, errors: { amount: message } })
  })

  it('여러 필드의 오류를 한꺼번에 돌려준다', () => {
    const result = toTransactionInput({ ...valid, amount: '', date: '2026-02-30', categoryId: '', paymentMethodId: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(['amount', 'categoryId', 'date', 'paymentMethodId'])
    }
  })

  it('태그가 너무 길면 거부한다', () => {
    const result = toTransactionInput({ ...valid, tags: 'a'.repeat(21) })
    expect(result).toMatchObject({ ok: false, errors: { tags: expect.any(String) } })
  })
})

describe('formValuesFromTransaction', () => {
  it('저장된 내역을 폼 값으로 되돌린다', () => {
    const transaction: Transaction = {
      id: 't1',
      type: 'income',
      amount: 3000000,
      date: asDateString('2026-10-25'),
      categoryId: 'cat-income-1',
      paymentMethodId: 'pay-4',
      memo: '10월 급여',
      tags: ['급여', '정기'],
      ownerId: 'member-me',
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    }
    expect(formValuesFromTransaction(transaction)).toEqual({
      type: 'income',
      amount: '3,000,000',
      date: '2026-10-25',
      categoryId: 'cat-income-1',
      paymentMethodId: 'pay-4',
      memo: '10월 급여',
      tags: '급여, 정기',
    })
  })
})

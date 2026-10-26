import { MAX_AMOUNT, formatAmountDigits, parseAmountInput, type AmountParseFailure } from '../../domain/money'
import { parseTagInput } from '../../domain/tags'
import type { Category, DateString, PaymentMethod, Transaction, TransactionInput, TransactionType } from '../../domain/types'
import { validateTransactionInput } from '../../domain/validation'

/** 폼 입력 상태. 입력창 값이므로 금액·태그도 문자열이다. */
export interface TransactionFormValues {
  type: TransactionType
  amount: string
  date: string
  categoryId: string
  paymentMethodId: string
  memo: string
  tags: string
}

export type TransactionFormErrors = Partial<Record<keyof TransactionFormValues, string>>

export type FormConversion =
  | { ok: true; input: TransactionInput }
  | { ok: false; errors: TransactionFormErrors }

const AMOUNT_MESSAGES: Record<AmountParseFailure, string> = {
  empty: '금액을 입력해 주세요.',
  invalid: '금액은 숫자만 입력해 주세요. (소수·음수는 입력할 수 없습니다)',
  'non-positive': '금액은 1원 이상이어야 합니다.',
  'too-large': `금액은 ${MAX_AMOUNT.toLocaleString('ko-KR')}원 이하로 입력해 주세요.`,
}

export function firstCategoryId(categories: readonly Category[], type: TransactionType): string {
  return categories.find((category) => category.type === type)?.id ?? ''
}

export function createEmptyFormValues(
  categories: readonly Category[],
  paymentMethods: readonly PaymentMethod[],
  today: DateString,
): TransactionFormValues {
  return {
    type: 'expense',
    amount: '',
    date: today,
    categoryId: firstCategoryId(categories, 'expense'),
    paymentMethodId: paymentMethods[0]?.id ?? '',
    memo: '',
    tags: '',
  }
}

export function formValuesFromTransaction(transaction: Transaction): TransactionFormValues {
  return {
    type: transaction.type,
    amount: formatAmountDigits(transaction.amount),
    date: transaction.date,
    categoryId: transaction.categoryId,
    paymentMethodId: transaction.paymentMethodId,
    memo: transaction.memo,
    tags: transaction.tags.join(', '),
  }
}

/** 폼 값을 저장소 입력으로 변환한다. 오류가 있으면 필드별 한국어 메시지를 돌려준다. */
export function toTransactionInput(values: TransactionFormValues): FormConversion {
  const amount = parseAmountInput(values.amount)
  const input: TransactionInput = {
    type: values.type,
    amount: amount.ok ? amount.value : 0,
    date: values.date,
    categoryId: values.categoryId,
    paymentMethodId: values.paymentMethodId,
    memo: values.memo.trim(),
    tags: parseTagInput(values.tags),
  }

  const errors: TransactionFormErrors = { ...validateTransactionInput(input) }
  if (!amount.ok) errors.amount = AMOUNT_MESSAGES[amount.reason]

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input }
}

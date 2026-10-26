import { isValidDateString } from './date'
import { MAX_AMOUNT, isValidAmount } from './money'
import { MAX_TAGS, MAX_TAG_LENGTH } from './tags'
import type { TransactionInput } from './types'

export const MAX_MEMO_LENGTH = 200

export type TransactionField = 'type' | 'amount' | 'date' | 'categoryId' | 'paymentMethodId' | 'memo' | 'tags'

export type TransactionErrors = Partial<Record<TransactionField, string>>

/** 거래 입력값을 검증해 필드별 오류 메시지를 반환한다. 오류가 없으면 빈 객체. */
export function validateTransactionInput(input: TransactionInput): TransactionErrors {
  const errors: TransactionErrors = {}

  if (input.type !== 'expense' && input.type !== 'income') {
    errors.type = '유형을 선택해 주세요.'
  }
  if (!isValidAmount(input.amount)) {
    errors.amount = `금액은 1원 이상 ${MAX_AMOUNT.toLocaleString('ko-KR')}원 이하의 정수여야 합니다.`
  }
  if (!isValidDateString(input.date)) {
    errors.date = '올바른 날짜를 입력해 주세요.'
  }
  if (!input.categoryId) {
    errors.categoryId = '카테고리를 선택해 주세요.'
  }
  if (!input.paymentMethodId) {
    errors.paymentMethodId = '결제수단을 선택해 주세요.'
  }
  if (input.memo.length > MAX_MEMO_LENGTH) {
    errors.memo = `메모는 ${MAX_MEMO_LENGTH}자 이하로 입력해 주세요.`
  }
  if (input.tags.length > MAX_TAGS) {
    errors.tags = `태그는 ${MAX_TAGS}개 이하로 입력해 주세요.`
  } else if (input.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    errors.tags = `태그는 ${MAX_TAG_LENGTH}자 이하로 입력해 주세요.`
  }

  return errors
}

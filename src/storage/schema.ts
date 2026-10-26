import { isValidDateString } from '../domain/date'
import { isValidAmount } from '../domain/money'
import { MAX_MEMO_LENGTH } from '../domain/validation'
import { CURRENT_SCHEMA_VERSION, type LedgerData, type TransactionType } from '../domain/types'
import { InvalidDataError } from './errors'
import { isRecord } from './migrations'

const MAX_REPORTED_PROBLEMS = 20

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isType(value: unknown): value is TransactionType {
  return value === 'expense' || value === 'income'
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

/**
 * 최신 스키마 버전의 데이터를 검증한다. 필드 형식뿐 아니라 참조 무결성(거래→카테고리/결제수단/구성원,
 * 거래 유형과 카테고리 유형 일치), id·이름 중복도 확인한다. 위반 시 InvalidDataError를 던진다.
 */
export function validateLedgerData(raw: unknown): LedgerData {
  const problems: string[] = []
  const report = (message: string) => {
    if (problems.length < MAX_REPORTED_PROBLEMS) problems.push(message)
  }

  if (!isRecord(raw)) throw new InvalidDataError('데이터 형식이 올바르지 않습니다.')
  if (raw.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new InvalidDataError(`지원하지 않는 schemaVersion: ${String(raw.schemaVersion)}`)
  }

  const members = asArray(raw.members)
  const categories = asArray(raw.categories)
  const paymentMethods = asArray(raw.paymentMethods)
  const transactions = asArray(raw.transactions)
  if (!members) report('members가 배열이 아닙니다.')
  if (!categories) report('categories가 배열이 아닙니다.')
  if (!paymentMethods) report('paymentMethods가 배열이 아닙니다.')
  if (!transactions) report('transactions가 배열이 아닙니다.')
  if (!members || !categories || !paymentMethods || !transactions) {
    throw new InvalidDataError('데이터 형식이 올바르지 않습니다.', problems)
  }

  const memberIds = new Set<string>()
  members.forEach((item, i) => {
    if (!isRecord(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.name)) {
      return report(`members[${i}]이 올바르지 않습니다.`)
    }
    if (memberIds.has(item.id)) report(`members[${i}]의 id가 중복됩니다.`)
    memberIds.add(item.id)
  })
  if (members.length === 0) report('구성원이 한 명 이상 필요합니다.')

  const categoryTypeById = new Map<string, TransactionType>()
  const categoryNames = new Set<string>()
  categories.forEach((item, i) => {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.name) ||
      !isType(item.type) ||
      typeof item.color !== 'string' ||
      typeof item.isDefault !== 'boolean' ||
      typeof item.isProtected !== 'boolean' ||
      typeof item.sortOrder !== 'number' ||
      !Number.isFinite(item.sortOrder)
    ) {
      return report(`categories[${i}]이 올바르지 않습니다.`)
    }
    if (categoryTypeById.has(item.id)) report(`categories[${i}]의 id가 중복됩니다.`)
    categoryTypeById.set(item.id, item.type)
    const nameKey = `${item.type}:${item.name.trim().toLowerCase()}`
    if (categoryNames.has(nameKey)) report(`categories[${i}]의 이름이 같은 유형에서 중복됩니다.`)
    categoryNames.add(nameKey)
  })

  const paymentMethodIds = new Set<string>()
  paymentMethods.forEach((item, i) => {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.name) ||
      typeof item.sortOrder !== 'number' ||
      !Number.isFinite(item.sortOrder)
    ) {
      return report(`paymentMethods[${i}]이 올바르지 않습니다.`)
    }
    if (paymentMethodIds.has(item.id)) report(`paymentMethods[${i}]의 id가 중복됩니다.`)
    paymentMethodIds.add(item.id)
  })

  const transactionIds = new Set<string>()
  transactions.forEach((item, i) => {
    if (!isRecord(item)) return report(`transactions[${i}]이 올바르지 않습니다.`)
    const label = `transactions[${i}]`
    if (!isNonEmptyString(item.id)) return report(`${label}.id가 올바르지 않습니다.`)
    if (transactionIds.has(item.id)) report(`${label}.id가 중복됩니다.`)
    transactionIds.add(item.id)

    if (!isType(item.type)) report(`${label}.type이 올바르지 않습니다.`)
    if (!isValidAmount(item.amount)) report(`${label}.amount가 올바르지 않습니다.`)
    if (!isValidDateString(item.date)) report(`${label}.date가 올바르지 않습니다.`)
    if (typeof item.memo !== 'string' || item.memo.length > MAX_MEMO_LENGTH) report(`${label}.memo가 올바르지 않습니다.`)
    if (!Array.isArray(item.tags) || item.tags.some((tag) => typeof tag !== 'string')) {
      report(`${label}.tags가 올바르지 않습니다.`)
    }
    if (typeof item.createdAt !== 'string' || typeof item.updatedAt !== 'string') {
      report(`${label}의 createdAt/updatedAt이 올바르지 않습니다.`)
    }

    const categoryType = typeof item.categoryId === 'string' ? categoryTypeById.get(item.categoryId) : undefined
    if (!categoryType) report(`${label}.categoryId가 존재하지 않는 카테고리를 가리킵니다.`)
    else if (categoryType !== item.type) report(`${label}의 유형과 카테고리 유형이 다릅니다.`)
    if (typeof item.paymentMethodId !== 'string' || !paymentMethodIds.has(item.paymentMethodId)) {
      report(`${label}.paymentMethodId가 존재하지 않는 결제수단을 가리킵니다.`)
    }
    if (typeof item.ownerId !== 'string' || !memberIds.has(item.ownerId)) {
      report(`${label}.ownerId가 존재하지 않는 구성원을 가리킵니다.`)
    }
  })

  if (problems.length > 0) throw new InvalidDataError('데이터 검증에 실패했습니다.', problems)

  // 위에서 모든 필드의 형식을 확인했으므로 LedgerData로 단언한다.
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    members: members as LedgerData['members'],
    categories: categories as LedgerData['categories'],
    paymentMethods: paymentMethods as LedgerData['paymentMethods'],
    transactions: transactions as LedgerData['transactions'],
  }
}

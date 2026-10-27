import { describe, expect, it } from 'vitest'
import { asDateString } from '../domain/date'
import { createSeedData } from '../domain/defaults'
import type { LedgerData, Transaction } from '../domain/types'
import { InvalidDataError } from './errors'
import { validateLedgerData } from './schema'

const transaction: Transaction = {
  id: 't1',
  type: 'expense',
  amount: 1000,
  date: asDateString('2026-10-27'),
  categoryId: 'cat-expense-1',
  paymentMethodId: 'pay-1',
  memo: '메모',
  tags: ['태그'],
  ownerId: 'member-me',
  createdAt: '2026-10-27T00:00:00.000Z',
  updatedAt: '2026-10-27T00:00:00.000Z',
}

function valid(): LedgerData {
  return { ...createSeedData(), transactions: [{ ...transaction }] }
}

/** 데이터를 변형해 검증 실패 메시지(details 포함)를 돌려준다. */
function problemsOf(mutate: (data: Record<string, any>) => void): string[] {
  const data = JSON.parse(JSON.stringify(valid())) as Record<string, any>
  mutate(data)
  try {
    validateLedgerData(data)
  } catch (error) {
    if (error instanceof InvalidDataError) return [error.message, ...error.details]
    throw error
  }
  return []
}

describe('validateLedgerData: 통과', () => {
  it('올바른 데이터는 그대로 돌려준다', () => {
    const data = valid()
    expect(validateLedgerData(data)).toEqual(data)
  })

  it('알 수 없는 추가 필드(exportedAt 등)는 결과에서 제외한다', () => {
    const result = validateLedgerData({ ...valid(), exportedAt: 'x', extra: 1 })
    expect(Object.keys(result).sort()).toEqual(['categories', 'members', 'paymentMethods', 'schemaVersion', 'transactions'])
  })
})

describe('validateLedgerData: 최상위 형식', () => {
  it.each([
    ['배열', []],
    ['null', null],
    ['숫자', 1],
  ])('%s는 거부한다', (_n, raw) => {
    expect(() => validateLedgerData(raw)).toThrow(InvalidDataError)
  })

  it('schemaVersion이 최신이 아니면 거부한다', () => {
    expect(problemsOf((d) => (d.schemaVersion = 2))[0]).toContain('지원하지 않는 schemaVersion')
  })

  it.each(['members', 'categories', 'paymentMethods', 'transactions'])('%s가 배열이 아니면 거부한다', (key) => {
    const problems = problemsOf((d) => (d[key] = 'x'))
    expect(problems).toContain(`${key}가 배열이 아닙니다.`)
  })
})

describe('validateLedgerData: 구성원', () => {
  it('구성원이 없으면 거부한다', () => {
    expect(problemsOf((d) => (d.members = []))).toContain('구성원이 한 명 이상 필요합니다.')
  })

  it.each([
    ['객체가 아님', (d: Record<string, any>) => (d.members[0] = 'x')],
    ['id 없음', (d: Record<string, any>) => delete d.members[0].id],
    ['이름이 공백', (d: Record<string, any>) => (d.members[0].name = '  ')],
  ])('구성원 %s', (_n, mutate) => {
    expect(problemsOf(mutate)).toContain('members[0]이 올바르지 않습니다.')
  })

  it('구성원 id가 중복되면 거부한다', () => {
    expect(problemsOf((d) => d.members.push({ ...d.members[0] }))).toContain('members[1]의 id가 중복됩니다.')
  })
})

describe('validateLedgerData: 카테고리', () => {
  it.each([
    ['객체가 아님', (c: any) => c.categories.splice(0, 1, 'x')],
    ['id 없음', (c: any) => delete c.categories[0].id],
    ['이름 없음', (c: any) => (c.categories[0].name = '')],
    ['유형이 잘못됨', (c: any) => (c.categories[0].type = 'both')],
    ['색이 문자열이 아님', (c: any) => (c.categories[0].color = 1)],
    ['isDefault가 불리언이 아님', (c: any) => (c.categories[0].isDefault = 'yes')],
    ['isProtected가 불리언이 아님', (c: any) => (c.categories[0].isProtected = null)],
    ['sortOrder가 숫자가 아님', (c: any) => (c.categories[0].sortOrder = '1')],
    ['sortOrder가 무한대', (c: any) => (c.categories[0].sortOrder = Infinity)],
  ])('카테고리 %s', (_n, mutate) => {
    expect(problemsOf(mutate)).toContain('categories[0]이 올바르지 않습니다.')
  })

  it('id가 중복되면 거부한다', () => {
    expect(problemsOf((d) => (d.categories[1].id = d.categories[0].id))).toContain('categories[1]의 id가 중복됩니다.')
  })

  it('같은 유형의 이름이 (대소문자·공백 무시) 중복되면 거부하지만 다른 유형은 허용한다', () => {
    expect(problemsOf((d) => (d.categories[1].name = ' 식비 '))).toContain('categories[1]의 이름이 같은 유형에서 중복됩니다.')
    expect(problemsOf((d) => (d.categories[9].name = '식비'))).toEqual([]) // 수입 카테고리 이름이 지출과 같아도 허용
  })
})

describe('validateLedgerData: 결제수단', () => {
  it.each([
    ['객체가 아님', (d: any) => d.paymentMethods.splice(0, 1, 5)],
    ['id 없음', (d: any) => delete d.paymentMethods[0].id],
    ['이름 없음', (d: any) => (d.paymentMethods[0].name = '')],
    ['sortOrder 오류', (d: any) => (d.paymentMethods[0].sortOrder = NaN)],
  ])('결제수단 %s', (_n, mutate) => {
    expect(problemsOf(mutate)).toContain('paymentMethods[0]이 올바르지 않습니다.')
  })

  it('id가 중복되면 거부한다', () => {
    expect(problemsOf((d) => (d.paymentMethods[1].id = d.paymentMethods[0].id))).toContain('paymentMethods[1]의 id가 중복됩니다.')
  })
})

describe('validateLedgerData: 거래', () => {
  it('거래가 객체가 아니면 거부한다', () => {
    expect(problemsOf((d) => (d.transactions[0] = 7))).toContain('transactions[0]이 올바르지 않습니다.')
  })

  it('id가 없거나 중복이면 거부한다', () => {
    expect(problemsOf((d) => delete d.transactions[0].id)).toContain('transactions[0].id가 올바르지 않습니다.')
    expect(problemsOf((d) => d.transactions.push({ ...d.transactions[0] }))).toContain('transactions[1].id가 중복됩니다.')
  })

  it.each([
    ['유형', (t: any) => (t.type = 'x'), 'transactions[0].type이 올바르지 않습니다.'],
    ['금액(0)', (t: any) => (t.amount = 0), 'transactions[0].amount가 올바르지 않습니다.'],
    ['금액(소수)', (t: any) => (t.amount = 1.5), 'transactions[0].amount가 올바르지 않습니다.'],
    ['금액(한도 초과)', (t: any) => (t.amount = 10_000_000_000), 'transactions[0].amount가 올바르지 않습니다.'],
    ['날짜(존재하지 않음)', (t: any) => (t.date = '2026-02-30'), 'transactions[0].date가 올바르지 않습니다.'],
    ['날짜(형식)', (t: any) => (t.date = '2026/10/27'), 'transactions[0].date가 올바르지 않습니다.'],
    ['메모(문자열 아님)', (t: any) => (t.memo = 1), 'transactions[0].memo가 올바르지 않습니다.'],
    ['메모(너무 김)', (t: any) => (t.memo = 'a'.repeat(201)), 'transactions[0].memo가 올바르지 않습니다.'],
    ['태그(배열 아님)', (t: any) => (t.tags = '태그'), 'transactions[0].tags가 올바르지 않습니다.'],
    ['태그(문자열 아님)', (t: any) => (t.tags = [1]), 'transactions[0].tags가 올바르지 않습니다.'],
    ['createdAt', (t: any) => (t.createdAt = 5), 'transactions[0]의 createdAt/updatedAt이 올바르지 않습니다.'],
    ['updatedAt', (t: any) => delete t.updatedAt, 'transactions[0]의 createdAt/updatedAt이 올바르지 않습니다.'],
    ['없는 카테고리', (t: any) => (t.categoryId = 'nope'), 'transactions[0].categoryId가 존재하지 않는 카테고리를 가리킵니다.'],
    ['카테고리 유형 불일치', (t: any) => (t.categoryId = 'cat-income-1'), 'transactions[0]의 유형과 카테고리 유형이 다릅니다.'],
    ['없는 결제수단', (t: any) => (t.paymentMethodId = 'nope'), 'transactions[0].paymentMethodId가 존재하지 않는 결제수단을 가리킵니다.'],
    ['결제수단이 문자열 아님', (t: any) => (t.paymentMethodId = 1), 'transactions[0].paymentMethodId가 존재하지 않는 결제수단을 가리킵니다.'],
    ['없는 구성원', (t: any) => (t.ownerId = 'nope'), 'transactions[0].ownerId가 존재하지 않는 구성원을 가리킵니다.'],
  ])('거래 %s', (_n, mutate, message) => {
    expect(problemsOf((d) => mutate(d.transactions[0]))).toContain(message)
  })

  it('문제는 최대 20개까지만 보고한다', () => {
    const problems = problemsOf((d) => {
      d.transactions = Array.from({ length: 30 }, (_, i) => ({ ...d.transactions[0], id: `t${i}`, amount: -1 }))
    })
    // 첫 항목은 요약 메시지
    expect(problems.length - 1).toBe(20)
  })
})

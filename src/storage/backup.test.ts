import { describe, expect, it } from 'vitest'
import { createSeedData } from '../domain/defaults'
import { asDateString } from '../domain/date'
import { CURRENT_SCHEMA_VERSION, type LedgerData, type Transaction } from '../domain/types'
import { backupFileName, createBackup, parseBackup, serializeBackup } from './backup'
import { InvalidDataError } from './errors'
import { migrateToLatest } from './migrations'
import { validateLedgerData } from './schema'

function sampleData(): LedgerData {
  const seed = createSeedData()
  const transaction: Transaction = {
    id: 't1',
    type: 'expense',
    amount: 12000,
    date: asDateString('2026-10-27'),
    categoryId: 'cat-expense-1',
    paymentMethodId: 'pay-1',
    memo: '점심',
    tags: ['외식'],
    ownerId: 'member-me',
    createdAt: '2026-10-27T00:00:00.000Z',
    updatedAt: '2026-10-27T00:00:00.000Z',
  }
  return { ...seed, transactions: [transaction] }
}

describe('백업 직렬화', () => {
  it('내보내기 → 가져오기 왕복 시 데이터가 동일하다', () => {
    const data = sampleData()
    const text = serializeBackup(createBackup(data, '2026-10-27T01:00:00.000Z'))
    expect(parseBackup(text)).toEqual(data)
  })

  it('백업 파일에 내보낸 시각이 포함된다', () => {
    const parsed = JSON.parse(serializeBackup(createBackup(sampleData(), '2026-10-27T01:00:00.000Z')))
    expect(parsed.exportedAt).toBe('2026-10-27T01:00:00.000Z')
  })

  it('파일 이름에 날짜를 넣는다', () => {
    expect(backupFileName(asDateString('2026-10-27'))).toBe('가계부-백업-2026-10-27.json')
  })
})

describe('parseBackup 거부 사례', () => {
  it('JSON이 아니면 거부한다', () => {
    expect(() => parseBackup('not json')).toThrow(InvalidDataError)
  })

  it.each([
    ['배열', '[]'],
    ['null', 'null'],
    ['schemaVersion 없음', '{"members":[]}'],
    ['미래 버전', JSON.stringify({ ...sampleData(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 })],
  ])('%s는 거부한다', (_name, text) => {
    expect(() => parseBackup(text)).toThrow(InvalidDataError)
  })
})

describe('validateLedgerData', () => {
  it('존재하지 않는 카테고리를 가리키는 거래를 거부한다', () => {
    const data = sampleData()
    data.transactions[0].categoryId = 'nope'
    expect(() => validateLedgerData(data)).toThrow(InvalidDataError)
  })

  it('거래 유형과 카테고리 유형이 다르면 거부한다', () => {
    const data = sampleData()
    data.transactions[0].categoryId = 'cat-income-1'
    expect(() => validateLedgerData(data)).toThrow(InvalidDataError)
  })

  it('잘못된 금액과 날짜를 거부하고 문제 목록을 담는다', () => {
    const data = sampleData()
    data.transactions[0].amount = 1.5
    data.transactions[0].date = '2026-02-30' as never
    const error = (() => {
      try {
        validateLedgerData(data)
      } catch (e) {
        return e as InvalidDataError
      }
    })()
    expect(error).toBeInstanceOf(InvalidDataError)
    expect(error!.details.length).toBeGreaterThanOrEqual(2)
  })

  it('id와 카테고리 이름의 중복을 거부한다', () => {
    const dupId = sampleData()
    dupId.transactions.push({ ...dupId.transactions[0] })
    expect(() => validateLedgerData(dupId)).toThrow(InvalidDataError)

    const dupName = sampleData()
    dupName.categories[1].name = dupName.categories[0].name
    expect(() => validateLedgerData(dupName)).toThrow(InvalidDataError)
  })

  it('구성원이 없으면 거부한다', () => {
    expect(() => validateLedgerData({ ...sampleData(), members: [] })).toThrow(InvalidDataError)
  })
})

describe('migrateToLatest', () => {
  it('최신 버전은 그대로 통과시킨다', () => {
    const data = sampleData()
    expect(migrateToLatest(data)).toEqual(data)
  })

  it('버전이 올바르지 않으면 거부한다', () => {
    expect(() => migrateToLatest({ schemaVersion: 0 })).toThrow(InvalidDataError)
    expect(() => migrateToLatest({ schemaVersion: 1.5 })).toThrow(InvalidDataError)
    expect(() => migrateToLatest({ schemaVersion: '1' })).toThrow(InvalidDataError)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { asDateString } from '../domain/date'
import { createSeedData } from '../domain/defaults'
import type { LedgerData, Transaction, TransactionInput } from '../domain/types'
import { StorageCorruptedError, StorageQuotaError } from './errors'
import {
  ESTIMATED_QUOTA_CHARS,
  LEDGER_STORAGE_KEY,
  WEBKIT_ESTIMATED_QUOTA_CHARS,
  createLocalStorageRepository,
  estimateQuotaChars,
} from './localStorageRepository'
import type { LedgerRepository } from './repository'

function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  }
}

const input = (overrides: Partial<TransactionInput> = {}): TransactionInput => ({
  type: 'expense',
  amount: 1000,
  date: '2026-10-27',
  categoryId: 'cat-expense-1',
  paymentMethodId: 'pay-1',
  memo: '메모',
  tags: ['태그'],
  ...overrides,
})

let storage: Storage
let repo: LedgerRepository
let parse: ReturnType<typeof vi.spyOn>

function makeRepo() {
  let counter = 0
  return createLocalStorageRepository({ getStorage: () => storage, newId: () => `id-${++counter}-${Math.random()}` })
}

beforeEach(async () => {
  storage = createMemoryStorage()
  repo = makeRepo()
  await repo.init()
  parse = vi.spyOn(JSON, 'parse')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('읽기 캐시', () => {
  it('같은 원문이면 여러 번 읽어도 한 번만 파싱한다(목록·카테고리·결제수단·내보내기)', async () => {
    await repo.transactions.list()
    await repo.categories.list()
    await repo.paymentMethods.list()
    await repo.exportAll()
    await repo.transactions.get('x')
    expect(parse).toHaveBeenCalledTimes(1)
  })

  it('이 저장소가 직접 쓴 뒤에는 다시 파싱하지 않는다', async () => {
    await repo.transactions.list() // 캐시 채우기
    parse.mockClear()

    const created = await repo.transactions.create(input())
    await repo.transactions.update(created.id, input({ amount: 2000 }))
    await repo.categories.create({ name: '새 카테고리', type: 'expense', color: '#000000' })
    await repo.transactions.remove(created.id)
    await repo.transactions.list()
    await repo.categories.list()
    expect(parse).not.toHaveBeenCalled()
  })

  it('다른 탭(다른 저장소 인스턴스)이 바꾸면 변경을 감지해 다시 읽는다', async () => {
    await repo.transactions.list()
    const other = makeRepo()
    await other.transactions.create(input({ memo: '다른 탭에서 추가' }))

    const list = await repo.transactions.list()
    expect(list.map((t) => t.memo)).toEqual(['다른 탭에서 추가'])
  })

  it('다른 탭이 데이터를 삭제·초기화해도 오래된 캐시를 쓰지 않는다', async () => {
    await repo.transactions.create(input())
    expect(await repo.transactions.list()).toHaveLength(1)

    storage.removeItem(LEDGER_STORAGE_KEY) // 다른 탭이 저장소를 비움
    expect(await repo.transactions.list()).toEqual([])
  })

  it('다른 탭이 데이터를 망가뜨리면 캐시 대신 손상 오류를 던진다', async () => {
    await repo.transactions.list()
    storage.setItem(LEDGER_STORAGE_KEY, '{broken')
    await expect(repo.transactions.list()).rejects.toBeInstanceOf(StorageCorruptedError)
    // 손상 상태는 캐시되지 않으며, 원문은 그대로 보존된다.
    expect(storage.getItem(LEDGER_STORAGE_KEY)).toBe('{broken')
  })

  it('쓰기에 실패하면 오래된 캐시가 남지 않고 이전 데이터가 유지된다', async () => {
    await repo.transactions.create(input({ memo: '기존' }))
    const original = storage.setItem.bind(storage)
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError')
    }
    await expect(repo.transactions.create(input({ memo: '실패할 내역' }))).rejects.toBeInstanceOf(StorageQuotaError)
    storage.setItem = original

    expect((await repo.transactions.list()).map((t) => t.memo)).toEqual(['기존'])
  })

  it('가져오기(importAll)·초기화(reset) 뒤에도 올바른 데이터를 돌려준다', async () => {
    await repo.transactions.create(input({ memo: '삭제될 내역' }))
    await repo.transactions.list()
    await repo.reset()
    expect(await repo.transactions.list()).toEqual([])

    const data: LedgerData = { ...createSeedData(), transactions: [transactionFixture('t1')] }
    await repo.importAll(data)
    expect((await repo.transactions.list()).map((t) => t.id)).toEqual(['t1'])
  })

  it('가져오기에 넘긴 객체를 얼리거나 공유하지 않는다', async () => {
    const data: LedgerData = { ...createSeedData(), transactions: [transactionFixture('t1')] }
    await repo.importAll(data)
    await repo.transactions.list()
    expect(Object.isFrozen(data)).toBe(false)
    expect(Object.isFrozen(data.transactions)).toBe(false)
    data.transactions[0].memo = '호출자가 나중에 바꿈'
    expect((await repo.transactions.get('t1'))?.memo).toBe('메모')
  })
})

function transactionFixture(id: string): Transaction {
  return {
    id,
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
}

describe('캐시된 데이터는 변경할 수 없다', () => {
  it('반환된 내역·태그·카테고리를 바꾸려 하면 오류가 난다', async () => {
    const created = await repo.transactions.create(input({ tags: ['a', 'b'] }))
    const [fromList] = await repo.transactions.list()
    const fromGet = await repo.transactions.get(created.id)

    expect(() => {
      fromList.amount = 1
    }).toThrow(TypeError)
    expect(() => fromList.tags.push('c')).toThrow(TypeError)
    expect(() => {
      fromGet!.memo = '변경'
    }).toThrow(TypeError)
    const categories = await repo.categories.list()
    expect(() => {
      categories[0].name = '변경'
    }).toThrow(TypeError)

    // 변경 시도는 저장된 데이터에 영향을 주지 않는다.
    expect((await repo.transactions.get(created.id))?.amount).toBe(1000)
  })

  it('내보내기 결과를 정렬해도 캐시 순서는 바뀌지 않는다(목록은 복사본)', async () => {
    await repo.transactions.create(input({ date: '2026-10-01' }))
    await repo.transactions.create(input({ date: '2026-10-05' }))
    const list = await repo.transactions.list()
    const sortedAgain = [...list].sort((a, b) => a.date.localeCompare(b.date))
    expect(sortedAgain[0].date).toBe('2026-10-01')
    expect((await repo.transactions.list())[0].date).toBe('2026-10-05')
  })
})

describe('exportRaw / getUsage', () => {
  it('저장된 원문을 그대로 돌려주고, 손상된 데이터도 읽을 수 있다', async () => {
    expect(await repo.exportRaw()).toBe(storage.getItem(LEDGER_STORAGE_KEY))
    storage.setItem(LEDGER_STORAGE_KEY, '{broken')
    expect(await repo.exportRaw()).toBe('{broken')
  })

  it('저장된 것이 없으면 null이다', async () => {
    storage.removeItem(LEDGER_STORAGE_KEY)
    expect(await repo.exportRaw()).toBeNull()
  })

  it('사용량은 키와 값의 문자 수이고 상한은 기본 추정값이다', async () => {
    const text = storage.getItem(LEDGER_STORAGE_KEY)!
    expect(await repo.getUsage()).toEqual({ usedChars: text.length + LEDGER_STORAGE_KEY.length, limitChars: estimateQuotaChars() })
    storage.removeItem(LEDGER_STORAGE_KEY)
    expect((await repo.getUsage()).usedChars).toBe(0)
  })

  it('상한을 주입할 수 있다', async () => {
    const small = createLocalStorageRepository({ getStorage: () => storage, quotaChars: 1234 })
    expect((await small.getUsage()).limitChars).toBe(1234)
  })
})

describe('대량 데이터(12,000건)', () => {
  function bulk(count: number): LedgerData {
    const seed = createSeedData()
    const transactions: Transaction[] = Array.from({ length: count }, (_, i) => ({
      ...transactionFixture(`bulk-${i}`),
      date: asDateString(`2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`),
      amount: 1000 + (i % 5000),
      tags: i % 3 === 0 ? ['외식', '회사'] : [],
    }))
    return { ...seed, transactions }
  }

  it('여러 번 읽어도 파싱은 한 번이고, 추가·수정·삭제는 다시 파싱하지 않는다', async () => {
    await repo.importAll(bulk(12_000))
    parse.mockClear()

    expect(await repo.transactions.list()).toHaveLength(12_000)
    await repo.categories.list()
    await repo.paymentMethods.list()
    expect(parse).toHaveBeenCalledTimes(1)

    const created = await repo.transactions.create(input())
    await repo.transactions.update(created.id, input({ amount: 5 }))
    await repo.transactions.remove(created.id)
    expect(await repo.transactions.list({ month: '2026-03' as never })).not.toHaveLength(0)
    expect(parse).toHaveBeenCalledTimes(1)
  })

  it('12,000건에서 추가·읽기가 충분히 빠르다(여유 있는 상한, 참고용)', async () => {
    await repo.importAll(bulk(12_000))
    await repo.transactions.list()

    const start = performance.now()
    for (let i = 0; i < 5; i++) {
      await repo.transactions.create(input({ memo: `성능 ${i}` }))
      await repo.transactions.list()
      await repo.categories.list()
      await repo.paymentMethods.list()
    }
    const perOperation = (performance.now() - start) / 5
    // 캐시가 없던 때는 이 한 사이클(추가+읽기 3회)이 수백 ms였다. 느린 CI에서도 깨지지 않도록 넉넉한 상한만 둔다.
    expect(perOperation).toBeLessThan(1500)
  })
})

describe('estimateQuotaChars', () => {
  it.each([
    ['Google Inc.', ESTIMATED_QUOTA_CHARS], // Chrome, Edge
    ['', ESTIMATED_QUOTA_CHARS], // Firefox
    ['Apple Computer, Inc.', WEBKIT_ESTIMATED_QUOTA_CHARS], // Safari, iOS 브라우저
  ])('vendor "%s" → %d자', (vendor, expected) => {
    expect(estimateQuotaChars(vendor)).toBe(expected)
  })

  it('WebKit은 한글이 들어간 데이터 기준으로 절반 수준의 상한을 쓴다', () => {
    expect(WEBKIT_ESTIMATED_QUOTA_CHARS).toBeLessThanOrEqual(ESTIMATED_QUOTA_CHARS / 2)
  })
})

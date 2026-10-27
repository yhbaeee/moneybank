import { beforeEach, describe, expect, it } from 'vitest'
import { asMonthString } from '../domain/date'
import { createSeedData } from '../domain/defaults'
import type { TransactionInput } from '../domain/types'
import {
  CategoryRuleError,
  NotFoundError,
  StorageCorruptedError,
  StorageQuotaError,
  StorageUnavailableError,
  ValidationError,
} from './errors'
import { LEDGER_STORAGE_KEY, createLocalStorageRepository } from './localStorageRepository'
import type { LedgerRepository } from './repository'

/** 테스트용 메모리 저장소 */
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

let storage: Storage
let repo: LedgerRepository
let counter: number

function makeRepo(target: Storage = storage) {
  return createLocalStorageRepository({
    getStorage: () => target,
    now: () => `2026-10-27T00:00:${String(counter).padStart(2, '0')}.000Z`,
    newId: () => `id-${++counter}`,
  })
}

const EXPENSE_FOOD = 'cat-expense-1'
const INCOME_SALARY = 'cat-income-1'
const PAY_CASH = 'pay-1'

function expense(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    type: 'expense',
    amount: 12000,
    date: '2026-10-27',
    categoryId: EXPENSE_FOOD,
    paymentMethodId: PAY_CASH,
    memo: '점심',
    tags: ['외식'],
    ...overrides,
  }
}

beforeEach(async () => {
  storage = createMemoryStorage()
  counter = 0
  repo = makeRepo()
  await repo.init()
})

describe('init', () => {
  it('최초 실행이면 기본 데이터를 저장한다', () => {
    const saved = JSON.parse(storage.getItem(LEDGER_STORAGE_KEY)!)
    expect(saved.categories).toHaveLength(13)
    expect(saved.paymentMethods).toHaveLength(5)
  })

  it('반복 호출해도 저장된 데이터를 바꾸지 않는다', async () => {
    await repo.transactions.create(expense())
    const before = storage.getItem(LEDGER_STORAGE_KEY)
    await repo.init()
    await repo.init()
    expect(storage.getItem(LEDGER_STORAGE_KEY)).toBe(before)
  })

  it('손상된 데이터는 덮어쓰지 않고 오류를 던진다', async () => {
    storage.setItem(LEDGER_STORAGE_KEY, '{broken')
    await expect(makeRepo().init()).rejects.toBeInstanceOf(StorageCorruptedError)
    expect(storage.getItem(LEDGER_STORAGE_KEY)).toBe('{broken')
  })

  it('스키마에 맞지 않는 데이터도 손상으로 취급한다', async () => {
    const bad = { ...createSeedData(), transactions: [{ id: 'x' }] }
    storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(bad))
    await expect(makeRepo().init()).rejects.toBeInstanceOf(StorageCorruptedError)
  })
})

describe('transactions', () => {
  it('등록하면 id, 소유자, 타임스탬프가 채워진다', async () => {
    const created = await repo.transactions.create(expense({ memo: '  점심  ', tags: ['#외식', '외식', ' 회식 '] }))
    expect(created).toMatchObject({
      type: 'expense',
      amount: 12000,
      date: '2026-10-27',
      memo: '점심',
      tags: ['외식', '회식'],
      ownerId: 'member-me',
    })
    expect(created.id).toBeTruthy()
    expect(created.createdAt).toBe(created.updatedAt)
    expect(await repo.transactions.get(created.id)).toEqual(created)
  })

  it('수정하면 id와 생성 시각은 유지하고 수정 시각만 바뀐다', async () => {
    const created = await repo.transactions.create(expense())
    const updated = await repo.transactions.update(created.id, expense({ amount: 15000, memo: '저녁' }))
    expect(updated).toMatchObject({ id: created.id, amount: 15000, memo: '저녁', createdAt: created.createdAt })
    expect(updated.updatedAt).not.toBe(created.updatedAt)
    expect(await repo.transactions.list()).toHaveLength(1)
  })

  it('삭제한다', async () => {
    const created = await repo.transactions.create(expense())
    await repo.transactions.remove(created.id)
    expect(await repo.transactions.list()).toEqual([])
  })

  it('없는 내역의 수정·삭제는 NotFoundError', async () => {
    await expect(repo.transactions.update('nope', expense())).rejects.toBeInstanceOf(NotFoundError)
    await expect(repo.transactions.remove('nope')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('잘못된 입력은 필드별 오류와 함께 거부하고 저장하지 않는다', async () => {
    const before = storage.getItem(LEDGER_STORAGE_KEY)
    const error = await repo.transactions.create(expense({ amount: 0, date: '2026-02-30' })).catch((e) => e)
    expect(error).toBeInstanceOf(ValidationError)
    expect(Object.keys(error.fields).sort()).toEqual(['amount', 'date'])
    expect(storage.getItem(LEDGER_STORAGE_KEY)).toBe(before)
  })

  it('거래 유형과 다른 유형의 카테고리나 없는 참조는 거부한다', async () => {
    await expect(repo.transactions.create(expense({ categoryId: INCOME_SALARY }))).rejects.toMatchObject({
      fields: { categoryId: expect.any(String) },
    })
    await expect(repo.transactions.create(expense({ categoryId: 'nope' }))).rejects.toBeInstanceOf(ValidationError)
    await expect(repo.transactions.create(expense({ paymentMethodId: 'nope' }))).rejects.toMatchObject({
      fields: { paymentMethodId: expect.any(String) },
    })
    await expect(repo.transactions.create(expense({ ownerId: 'nope' }))).rejects.toMatchObject({
      fields: { ownerId: expect.any(String) },
    })
  })

  it('수입도 등록할 수 있다', async () => {
    const created = await repo.transactions.create({
      ...expense({ type: 'income', categoryId: INCOME_SALARY, amount: 3_000_000 }),
    })
    expect(created.type).toBe('income')
  })

  it('월로 필터링하고 날짜 내림차순, 같은 날짜는 최근 생성 순으로 정렬한다', async () => {
    const a = await repo.transactions.create(expense({ date: '2026-09-30' }))
    const b = await repo.transactions.create(expense({ date: '2026-10-01' }))
    const c = await repo.transactions.create(expense({ date: '2026-10-31' }))
    const d = await repo.transactions.create(expense({ date: '2026-10-31' }))
    const e = await repo.transactions.create(expense({ date: '2026-11-01' }))

    const october = await repo.transactions.list({ month: asMonthString('2026-10') })
    expect(october.map((t) => t.id)).toEqual([d.id, c.id, b.id])

    const all = await repo.transactions.list()
    expect(all.map((t) => t.id)).toEqual([e.id, d.id, c.id, b.id, a.id])
  })
})

describe('categories', () => {
  it('이름을 다듬어 추가하고 같은 유형의 마지막 순서로 둔다', async () => {
    const created = await repo.categories.create({ name: '  반려동물 ', type: 'expense', color: '#123456' })
    expect(created).toMatchObject({ name: '반려동물', isDefault: false, isProtected: false, sortOrder: 10 })
  })

  it('빈 이름이나 같은 유형의 중복 이름은 거부하고 다른 유형은 허용한다', async () => {
    await expect(repo.categories.create({ name: '  ', type: 'expense', color: '#000000' })).rejects.toMatchObject({
      code: 'invalid-name',
    })
    await expect(repo.categories.create({ name: '식비', type: 'expense', color: '#000000' })).rejects.toMatchObject({
      code: 'duplicate-name',
    })
    await expect(repo.categories.create({ name: '식비', type: 'income', color: '#000000' })).resolves.toBeTruthy()
  })

  it('이름과 색상을 수정하되 다른 카테고리와 중복되면 거부한다', async () => {
    const updated = await repo.categories.update(EXPENSE_FOOD, { name: '외식·식비', color: '#111111' })
    expect(updated).toMatchObject({ name: '외식·식비', color: '#111111' })
    await expect(repo.categories.update(EXPENSE_FOOD, { name: '교통' })).rejects.toBeInstanceOf(CategoryRuleError)
    await expect(repo.categories.update('nope', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError)
  })

  it("보호된 '기타'는 삭제할 수 없다", async () => {
    await expect(repo.categories.remove('cat-expense-9')).rejects.toMatchObject({ code: 'protected' })
  })

  it('사용하지 않는 카테고리는 바로 삭제된다', async () => {
    await repo.categories.remove('cat-expense-2')
    const names = (await repo.categories.list()).map((c) => c.id)
    expect(names).not.toContain('cat-expense-2')
  })

  it('사용 중인 카테고리는 같은 유형의 카테고리로 재배정해야 삭제된다', async () => {
    const tx = await repo.transactions.create(expense())
    await expect(repo.categories.remove(EXPENSE_FOOD)).rejects.toMatchObject({ code: 'in-use' })
    await expect(repo.categories.remove(EXPENSE_FOOD, INCOME_SALARY)).rejects.toMatchObject({
      code: 'invalid-reassign',
    })
    await expect(repo.categories.remove(EXPENSE_FOOD, EXPENSE_FOOD)).rejects.toMatchObject({
      code: 'invalid-reassign',
    })

    await repo.categories.remove(EXPENSE_FOOD, 'cat-expense-2')
    expect((await repo.transactions.get(tx.id))?.categoryId).toBe('cat-expense-2')
    expect((await repo.categories.list()).some((c) => c.id === EXPENSE_FOOD)).toBe(false)
  })
})

describe('paymentMethods', () => {
  it('기본 결제수단을 순서대로 반환한다', async () => {
    expect((await repo.paymentMethods.list()).map((p) => p.name)).toEqual(['현금', '체크카드', '신용카드', '계좌이체', '기타'])
  })
})

describe('exportAll / importAll / reset', () => {
  it('내보낸 데이터를 가져오면 그대로 복원된다', async () => {
    await repo.transactions.create(expense())
    const exported = await repo.exportAll()

    await repo.reset()
    expect(await repo.transactions.list()).toEqual([])

    await repo.importAll(exported)
    expect(await repo.exportAll()).toEqual(exported)
  })

  it('잘못된 데이터를 가져오면 기존 데이터를 변경하지 않는다', async () => {
    await repo.transactions.create(expense())
    const before = storage.getItem(LEDGER_STORAGE_KEY)
    const bad = { ...(await repo.exportAll()), transactions: [{ id: 'x' }] }
    await expect(repo.importAll(bad as never)).rejects.toBeDefined()
    expect(storage.getItem(LEDGER_STORAGE_KEY)).toBe(before)
  })

  it('reset은 기본 데이터로 되돌린다', async () => {
    await repo.transactions.create(expense())
    await repo.categories.create({ name: '새 카테고리', type: 'expense', color: '#000000' })
    await repo.reset()
    expect(await repo.exportAll()).toEqual(createSeedData())
  })
})

describe('저장소 오류', () => {
  it('용량 초과는 StorageQuotaError로 변환한다', async () => {
    const full = createMemoryStorage()
    const quotaRepo = makeRepo(full)
    await quotaRepo.init()
    full.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError')
    }
    await expect(quotaRepo.transactions.create(expense())).rejects.toBeInstanceOf(StorageQuotaError)
  })

  it('용량 초과가 아닌 쓰기 실패는 StorageUnavailableError로 변환하고 기존 데이터를 보존한다', async () => {
    const readonly = createMemoryStorage()
    const readonlyRepo = makeRepo(readonly)
    await readonlyRepo.init()
    const before = readonly.getItem(LEDGER_STORAGE_KEY)
    readonly.setItem = () => {
      throw new DOMException('denied', 'SecurityError')
    }
    await expect(readonlyRepo.transactions.create(expense())).rejects.toBeInstanceOf(StorageUnavailableError)
    expect(readonly.getItem(LEDGER_STORAGE_KEY)).toBe(before)
  })

  it('읽기 중 저장소 예외도 StorageUnavailableError로 변환한다', async () => {
    const flaky = createMemoryStorage()
    const flakyRepo = makeRepo(flaky)
    await flakyRepo.init()
    flaky.getItem = () => {
      throw new Error('boom')
    }
    await expect(flakyRepo.transactions.list()).rejects.toBeInstanceOf(StorageUnavailableError)
  })

  it('저장소 접근이 막혀 있으면 StorageUnavailableError로 변환한다', async () => {
    const blocked = createLocalStorageRepository({
      getStorage: () => {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    await expect(blocked.init()).rejects.toBeInstanceOf(StorageUnavailableError)
    await expect(blocked.transactions.list()).rejects.toBeInstanceOf(StorageUnavailableError)
  })
})

import { asDateString, monthOf } from '../domain/date'
import { createSeedData } from '../domain/defaults'
import { normalizeTags } from '../domain/tags'
import type {
  Category,
  CategoryInput,
  CategoryPatch,
  LedgerData,
  Transaction,
  TransactionInput,
} from '../domain/types'
import { validateTransactionInput } from '../domain/validation'
import {
  CategoryRuleError,
  NotFoundError,
  StorageCorruptedError,
  StorageQuotaError,
  StorageUnavailableError,
  ValidationError,
} from './errors'
import { migrateToLatest } from './migrations'
import type { LedgerRepository, TransactionQuery } from './repository'
import { validateLedgerData } from './schema'

export const LEDGER_STORAGE_KEY = 'ledger.data'

const MAX_CATEGORY_NAME_LENGTH = 20

export interface LocalStorageRepositoryOptions {
  /** 저장소 접근 함수. 접근 자체가 실패할 수 있어 지연 평가한다. */
  getStorage?: () => Storage
  now?: () => string
  newId?: () => string
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22)
  )
}

/**
 * 문서 전체를 localStorage 키 하나에 저장하는 구현체. 매 호출마다 읽고 검증하며, 쓰기는 전체를 한 번에 저장한다.
 * 데이터가 손상되어 있으면 덮어쓰지 않고 StorageCorruptedError를 던진다.
 */
export function createLocalStorageRepository(options: LocalStorageRepositoryOptions = {}): LedgerRepository {
  const getStorage = options.getStorage ?? (() => localStorage)
  const now = options.now ?? (() => new Date().toISOString())
  const newId = options.newId ?? (() => crypto.randomUUID())

  function readText(): string | null {
    try {
      return getStorage().getItem(LEDGER_STORAGE_KEY)
    } catch (cause) {
      throw new StorageUnavailableError('브라우저 저장소를 사용할 수 없습니다.', { cause })
    }
  }

  function write(data: LedgerData): void {
    try {
      getStorage().setItem(LEDGER_STORAGE_KEY, JSON.stringify(data))
    } catch (cause) {
      if (isQuotaError(cause)) throw new StorageQuotaError('저장 공간이 부족합니다.', { cause })
      throw new StorageUnavailableError('브라우저 저장소를 사용할 수 없습니다.', { cause })
    }
  }

  /** 저장된 문서를 읽는다. 아직 저장된 적이 없으면 기본 데이터를 돌려주되 저장은 하지 않는다. */
  function read(): LedgerData {
    const text = readText()
    if (text === null) return createSeedData()
    try {
      return validateLedgerData(migrateToLatest(JSON.parse(text)))
    } catch (cause) {
      throw new StorageCorruptedError('저장된 데이터를 읽을 수 없습니다.', { cause })
    }
  }

  function prepareTransaction(data: LedgerData, input: TransactionInput) {
    const prepared = { ...input, memo: input.memo.trim(), tags: normalizeTags(input.tags) }
    const errors: Record<string, string> = { ...validateTransactionInput(prepared) }

    const category = data.categories.find((c) => c.id === prepared.categoryId)
    if (!errors.categoryId && (!category || category.type !== prepared.type)) {
      errors.categoryId = '선택한 유형에 맞는 카테고리를 선택해 주세요.'
    }
    if (!errors.paymentMethodId && !data.paymentMethods.some((p) => p.id === prepared.paymentMethodId)) {
      errors.paymentMethodId = '존재하지 않는 결제수단입니다.'
    }
    if (prepared.ownerId !== undefined && !data.members.some((m) => m.id === prepared.ownerId)) {
      errors.ownerId = '존재하지 않는 구성원입니다.'
    }
    if (Object.keys(errors).length > 0) throw new ValidationError(errors)

    return { ...prepared, date: asDateString(prepared.date) }
  }

  function sortTransactions(list: Transaction[]): Transaction[] {
    return [...list].sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    )
  }

  function checkCategoryName(data: LedgerData, name: string, type: Category['type'], selfId?: string): string {
    const trimmed = name.trim()
    if (trimmed === '' || trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
      throw new CategoryRuleError('invalid-name', `카테고리 이름은 1~${MAX_CATEGORY_NAME_LENGTH}자로 입력해 주세요.`)
    }
    const duplicated = data.categories.some(
      (c) => c.id !== selfId && c.type === type && c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (duplicated) throw new CategoryRuleError('duplicate-name', '같은 이름의 카테고리가 이미 있습니다.')
    return trimmed
  }

  return {
    transactions: {
      async list(query: TransactionQuery = {}) {
        const { transactions } = read()
        const filtered = query.month ? transactions.filter((t) => monthOf(t.date) === query.month) : transactions
        return sortTransactions(filtered)
      },

      async get(id) {
        return read().transactions.find((t) => t.id === id)
      },

      async create(input) {
        const data = read()
        const prepared = prepareTransaction(data, input)
        const timestamp = now()
        const transaction: Transaction = {
          ...prepared,
          id: newId(),
          ownerId: prepared.ownerId ?? data.members[0].id,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        write({ ...data, transactions: [...data.transactions, transaction] })
        return transaction
      },

      async update(id, input) {
        const data = read()
        const existing = data.transactions.find((t) => t.id === id)
        if (!existing) throw new NotFoundError('내역을 찾을 수 없습니다.')
        const prepared = prepareTransaction(data, input)
        const updated: Transaction = {
          ...prepared,
          id: existing.id,
          ownerId: prepared.ownerId ?? existing.ownerId,
          createdAt: existing.createdAt,
          updatedAt: now(),
        }
        write({ ...data, transactions: data.transactions.map((t) => (t.id === id ? updated : t)) })
        return updated
      },

      async remove(id) {
        const data = read()
        if (!data.transactions.some((t) => t.id === id)) throw new NotFoundError('내역을 찾을 수 없습니다.')
        write({ ...data, transactions: data.transactions.filter((t) => t.id !== id) })
      },
    },

    categories: {
      async list() {
        return [...read().categories].sort((a, b) => a.sortOrder - b.sortOrder)
      },

      async create(input: CategoryInput) {
        const data = read()
        const name = checkCategoryName(data, input.name, input.type)
        const sameType = data.categories.filter((c) => c.type === input.type)
        const category: Category = {
          id: newId(),
          name,
          type: input.type,
          color: input.color,
          isDefault: false,
          isProtected: false,
          sortOrder: sameType.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1,
        }
        write({ ...data, categories: [...data.categories, category] })
        return category
      },

      async update(id, patch: CategoryPatch) {
        const data = read()
        const existing = data.categories.find((c) => c.id === id)
        if (!existing) throw new NotFoundError('카테고리를 찾을 수 없습니다.')
        const updated: Category = {
          ...existing,
          name: patch.name === undefined ? existing.name : checkCategoryName(data, patch.name, existing.type, id),
          color: patch.color ?? existing.color,
        }
        write({ ...data, categories: data.categories.map((c) => (c.id === id ? updated : c)) })
        return updated
      },

      async remove(id, reassignToId) {
        const data = read()
        const target = data.categories.find((c) => c.id === id)
        if (!target) throw new NotFoundError('카테고리를 찾을 수 없습니다.')
        if (target.isProtected) throw new CategoryRuleError('protected', `'${target.name}' 카테고리는 삭제할 수 없습니다.`)

        const inUse = data.transactions.some((t) => t.categoryId === id)
        let transactions = data.transactions
        if (inUse) {
          if (reassignToId === undefined) {
            throw new CategoryRuleError('in-use', '사용 중인 카테고리입니다. 내역을 옮길 카테고리를 선택해 주세요.')
          }
          const destination = data.categories.find((c) => c.id === reassignToId)
          if (!destination || destination.id === id || destination.type !== target.type) {
            throw new CategoryRuleError('invalid-reassign', '같은 유형의 다른 카테고리를 선택해 주세요.')
          }
          const timestamp = now()
          transactions = data.transactions.map((t) =>
            t.categoryId === id ? { ...t, categoryId: destination.id, updatedAt: timestamp } : t,
          )
        }
        write({ ...data, transactions, categories: data.categories.filter((c) => c.id !== id) })
      },
    },

    paymentMethods: {
      async list() {
        return [...read().paymentMethods].sort((a, b) => a.sortOrder - b.sortOrder)
      },
    },

    async init() {
      if (readText() === null) write(createSeedData())
      else read() // 손상 여부만 확인한다.
    },

    async exportAll() {
      return read()
    },

    async importAll(data) {
      const validated = validateLedgerData(data)
      write(validated)
    },

    async reset() {
      write(createSeedData())
    },
  }
}

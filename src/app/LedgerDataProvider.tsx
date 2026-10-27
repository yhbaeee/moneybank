import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Category, PaymentMethod, Transaction } from '../domain/types'
import { LEDGER_STORAGE_KEY } from '../storage/localStorageRepository'
import type { StorageUsage } from '../storage/repository'
import { describeError } from './describeError'
import { LedgerDataContext, type LedgerDataValue } from './ledgerDataContext'
import { useLedger } from './ledgerContext'

interface Snapshot {
  transactions: Transaction[]
  categories: Category[]
  paymentMethods: PaymentMethod[]
  usage: StorageUsage
}

type State = { kind: 'loading' } | { kind: 'ready'; snapshot: Snapshot } | { kind: 'error'; error: unknown }

/** 저장소의 데이터를 메모리에 올려 두고, 변경 후 다시 읽어 화면에 반영한다. */
export function LedgerDataProvider({ children }: { children: ReactNode }) {
  const repository = useLedger()
  const [state, setState] = useState<State>({ kind: 'loading' })

  const load = useCallback(async (): Promise<Snapshot> => {
    const [transactions, categories, paymentMethods, usage] = await Promise.all([
      repository.transactions.list(),
      repository.categories.list(),
      repository.paymentMethods.list(),
      repository.getUsage(),
    ])
    return { transactions, categories, paymentMethods, usage }
  }, [repository])

  useEffect(() => {
    let cancelled = false
    load().then(
      (snapshot) => {
        if (!cancelled) setState({ kind: 'ready', snapshot })
      },
      (error: unknown) => {
        if (!cancelled) setState({ kind: 'error', error })
      },
    )
    return () => {
      cancelled = true
    }
  }, [load])

  // 다른 탭이 데이터를 바꾸면(storage 이벤트) 화면을 최신 상태로 다시 불러온다.
  // 이 탭의 저장은 storage 이벤트를 발생시키지 않으므로 중복 갱신은 없다.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== LEDGER_STORAGE_KEY) return
      load().then(
        (snapshot) => setState({ kind: 'ready', snapshot }),
        (error: unknown) => setState({ kind: 'error', error }),
      )
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [load])

  const snapshot = state.kind === 'ready' ? state.snapshot : null

  const value = useMemo<LedgerDataValue | null>(() => {
    if (!snapshot) return null
    const refresh = async () => setState({ kind: 'ready', snapshot: await load() })
    return {
      ...snapshot,
      createTransaction: async (input) => {
        const created = await repository.transactions.create(input)
        await refresh()
        return created
      },
      updateTransaction: async (id, input) => {
        const updated = await repository.transactions.update(id, input)
        await refresh()
        return updated
      },
      removeTransaction: async (id) => {
        await repository.transactions.remove(id)
        await refresh()
      },
      createCategory: async (input) => {
        const created = await repository.categories.create(input)
        await refresh()
        return created
      },
      updateCategory: async (id, patch) => {
        const updated = await repository.categories.update(id, patch)
        await refresh()
        return updated
      },
      removeCategory: async (id, reassignToId) => {
        await repository.categories.remove(id, reassignToId)
        await refresh()
      },
      exportData: () => repository.exportAll(),
      importData: async (data) => {
        await repository.importAll(data)
        await refresh()
      },
      resetData: async () => {
        await repository.reset()
        await refresh()
      },
    }
  }, [snapshot, repository, load])

  if (state.kind === 'error') {
    return (
      <div role="alert" className="mx-auto max-w-md p-4">
        <h1 className="text-lg font-bold">데이터를 불러올 수 없습니다</h1>
        <p className="mt-2 text-sm text-muted">{describeError(state.error)}</p>
      </div>
    )
  }
  if (!value) {
    return (
      <p role="status" className="p-4 text-sm text-muted">
        불러오는 중…
      </p>
    )
  }
  return <LedgerDataContext.Provider value={value}>{children}</LedgerDataContext.Provider>
}

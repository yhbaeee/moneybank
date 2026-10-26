import { useEffect, useState, type ReactNode } from 'react'
import { ledgerRepository } from '../storage'
import { StorageCorruptedError, StorageUnavailableError } from '../storage/errors'
import type { LedgerRepository } from '../storage/repository'
import { LedgerContext } from './ledgerContext'

type Status = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; error: unknown }

function describeError(error: unknown): string {
  if (error instanceof StorageCorruptedError) {
    return '저장된 데이터가 손상되어 읽을 수 없습니다. 기존 데이터는 지우지 않고 그대로 두었습니다.'
  }
  if (error instanceof StorageUnavailableError) {
    return '브라우저 저장소를 사용할 수 없습니다. 시크릿 모드이거나 사이트 데이터가 차단되어 있는지 확인해 주세요.'
  }
  return '데이터를 불러오는 중 문제가 발생했습니다.'
}

interface LedgerProviderProps {
  children: ReactNode
  /** 테스트에서 다른 구현체를 주입할 때 사용한다. */
  repository?: LedgerRepository
}

/** 시작 시 저장소를 초기화(최초 실행이면 기본 데이터 저장)하고, 준비되면 자식을 렌더링한다. */
export function LedgerProvider({ children, repository = ledgerRepository }: LedgerProviderProps) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    repository.init().then(
      () => {
        if (!cancelled) setStatus({ kind: 'ready' })
      },
      (error: unknown) => {
        if (!cancelled) setStatus({ kind: 'error', error })
      },
    )
    return () => {
      cancelled = true
    }
  }, [repository])

  if (status.kind === 'loading') {
    return (
      <p role="status" className="p-4 text-sm text-muted">
        불러오는 중…
      </p>
    )
  }
  if (status.kind === 'error') {
    return (
      <div role="alert" className="mx-auto max-w-md p-4">
        <h1 className="text-lg font-bold">데이터를 불러올 수 없습니다</h1>
        <p className="mt-2 text-sm text-muted">{describeError(status.error)}</p>
      </div>
    )
  }
  return <LedgerContext.Provider value={repository}>{children}</LedgerContext.Provider>
}

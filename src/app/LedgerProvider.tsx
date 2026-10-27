import { useEffect, useState, type ReactNode } from 'react'
import { createSessionRepository, ledgerRepository } from '../storage'
import { StorageCorruptedError, StorageUnavailableError } from '../storage/errors'
import type { LedgerRepository } from '../storage/repository'
import { describeError } from './describeError'
import { LedgerContext, StorageModeContext, type StorageMode } from './ledgerContext'
import { RecoveryScreen } from './RecoveryScreen'

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; repository: LedgerRepository; mode: StorageMode }
  | { kind: 'recovery'; repository: LedgerRepository }
  | { kind: 'error'; error: unknown }

interface LedgerProviderProps {
  children: ReactNode
  /** 테스트에서 다른 구현체를 주입할 때 사용한다. */
  repository?: LedgerRepository
}

/**
 * 시작 시 저장소를 초기화(최초 실행이면 기본 데이터 저장)하고, 준비되면 자식을 렌더링한다.
 * - 데이터가 손상되어 있으면 복구 화면을 보여 준다(원본은 지우지 않는다).
 * - 브라우저 저장소를 쓸 수 없으면(시크릿 모드 등) 이 창이 열려 있는 동안만 유지되는 임시 저장소로 계속 쓸 수 있게 한다.
 */
export function LedgerProvider({ children, repository = ledgerRepository }: LedgerProviderProps) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  // 복구에 성공하면 값을 올려 같은 저장소로 다시 초기화한다.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        await repository.init()
        if (!cancelled) setState({ kind: 'ready', repository, mode: 'persistent' })
      } catch (error) {
        if (cancelled) return
        if (error instanceof StorageCorruptedError) {
          setState({ kind: 'recovery', repository })
        } else if (error instanceof StorageUnavailableError) {
          try {
            const session = createSessionRepository()
            await session.init()
            if (!cancelled) setState({ kind: 'ready', repository: session, mode: 'session' })
          } catch (fallbackError) {
            if (!cancelled) setState({ kind: 'error', error: fallbackError })
          }
        } else {
          setState({ kind: 'error', error })
        }
      }
    }

    void start()
    return () => {
      cancelled = true
    }
  }, [repository, attempt])

  if (state.kind === 'loading') {
    return (
      <p role="status" className="p-4 text-sm text-muted">
        불러오는 중…
      </p>
    )
  }
  if (state.kind === 'recovery') {
    return (
      <RecoveryScreen
        repository={state.repository}
        onRecovered={() => {
          setState({ kind: 'loading' })
          setAttempt((value) => value + 1)
        }}
      />
    )
  }
  if (state.kind === 'error') {
    return (
      <div role="alert" className="mx-auto max-w-md p-4">
        <h1 className="text-lg font-bold">데이터를 불러올 수 없습니다</h1>
        <p className="mt-2 text-sm text-muted">{describeError(state.error)}</p>
      </div>
    )
  }
  return (
    <LedgerContext.Provider value={state.repository}>
      <StorageModeContext.Provider value={state.mode}>{children}</StorageModeContext.Provider>
    </LedgerContext.Provider>
  )
}

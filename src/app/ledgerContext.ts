import { createContext, useContext } from 'react'
import type { LedgerRepository } from '../storage/repository'

export const LedgerContext = createContext<LedgerRepository | null>(null)

/** UI는 이 훅으로 저장소 인터페이스를 얻는다. localStorage를 직접 호출하지 않는다. */
export function useLedger(): LedgerRepository {
  const repository = useContext(LedgerContext)
  if (!repository) throw new Error('useLedger는 LedgerProvider 안에서 사용해야 합니다.')
  return repository
}

/**
 * persistent: 브라우저 저장소에 저장한다.
 * session: 브라우저 저장소를 쓸 수 없어 이 창이 열려 있는 동안만 유지되는 임시 저장소를 쓴다.
 */
export type StorageMode = 'persistent' | 'session'

export const StorageModeContext = createContext<StorageMode>('persistent')

export function useStorageMode(): StorageMode {
  return useContext(StorageModeContext)
}

import { createLocalStorageRepository } from './localStorageRepository'
import { createMemoryStorage } from './memoryStorage'
import type { LedgerRepository } from './repository'

/** 앱 전체에서 공유하는 저장소 인스턴스. 저장소를 바꿀 때는 이 부분만 교체한다. */
export const ledgerRepository = createLocalStorageRepository()

/** 이 페이지 세션 동안만 유지되는 대체 저장 공간(브라우저 저장소를 쓸 수 없을 때). */
const sessionStorageFallback = createMemoryStorage()

/** 브라우저 저장소를 쓸 수 없을 때 쓰는, 창을 닫으면 사라지는 저장소. 용량 제한은 없다. */
export function createSessionRepository(): LedgerRepository {
  return createLocalStorageRepository({ getStorage: () => sessionStorageFallback, quotaChars: Number.POSITIVE_INFINITY })
}

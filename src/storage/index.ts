import { createLocalStorageRepository } from './localStorageRepository'

/** 앱 전체에서 공유하는 저장소 인스턴스. 저장소를 바꿀 때는 이 한 줄만 교체한다. */
export const ledgerRepository = createLocalStorageRepository()

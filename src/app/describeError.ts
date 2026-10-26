import { StorageCorruptedError, StorageUnavailableError } from '../storage/errors'

/** 저장소 오류를 사용자에게 보여 줄 안내 문구로 바꾼다. */
export function describeError(error: unknown): string {
  if (error instanceof StorageCorruptedError) {
    return '저장된 데이터가 손상되어 읽을 수 없습니다. 기존 데이터는 지우지 않고 그대로 두었습니다.'
  }
  if (error instanceof StorageUnavailableError) {
    return '브라우저 저장소를 사용할 수 없습니다. 시크릿 모드이거나 사이트 데이터가 차단되어 있는지 확인해 주세요.'
  }
  return '데이터를 불러오는 중 문제가 발생했습니다.'
}

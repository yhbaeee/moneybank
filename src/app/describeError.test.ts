import { describe, expect, it } from 'vitest'
import { StorageCorruptedError, StorageUnavailableError } from '../storage/errors'
import { describeError } from './describeError'

describe('describeError', () => {
  it('손상된 데이터는 원본을 지우지 않았다고 알린다', () => {
    expect(describeError(new StorageCorruptedError('x'))).toContain('지우지 않고 그대로 두었습니다')
  })

  it('저장소를 쓸 수 없으면 원인을 안내한다', () => {
    expect(describeError(new StorageUnavailableError('x'))).toContain('저장소를 사용할 수 없습니다')
  })

  it('그 외 오류는 일반 안내를 한다', () => {
    expect(describeError(new Error('x'))).toBe('데이터를 불러오는 중 문제가 발생했습니다.')
    expect(describeError('문자열')).toBe('데이터를 불러오는 중 문제가 발생했습니다.')
  })
})

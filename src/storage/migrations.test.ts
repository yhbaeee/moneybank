import { describe, expect, it } from 'vitest'
import { InvalidDataError } from './errors'
import { isRecord, migrateToLatest } from './migrations'

describe('migrateToLatest: 버전 체인', () => {
  const migrations = {
    1: (data: Record<string, unknown>) => ({ ...data, label: `${String(data.label)}>v2` }),
    2: (data: Record<string, unknown>) => ({ ...data, label: `${String(data.label)}>v3` }),
  }

  it('오래된 버전을 최신까지 순서대로 올리고 schemaVersion을 갱신한다', () => {
    const result = migrateToLatest({ schemaVersion: 1, label: 'v1' }, { currentVersion: 3, migrations })
    expect(result).toEqual({ schemaVersion: 3, label: 'v1>v2>v3' })
  })

  it('중간 버전에서 시작하면 남은 단계만 적용한다', () => {
    expect(migrateToLatest({ schemaVersion: 2, label: 'v2' }, { currentVersion: 3, migrations })).toEqual({
      schemaVersion: 3,
      label: 'v2>v3',
    })
  })

  it('이미 최신이면 그대로 돌려준다', () => {
    const data = { schemaVersion: 3, label: 'x' }
    expect(migrateToLatest(data, { currentVersion: 3, migrations })).toEqual(data)
  })

  it('원본 객체를 변경하지 않는다', () => {
    const data = { schemaVersion: 1, label: 'v1' }
    migrateToLatest(data, { currentVersion: 3, migrations })
    expect(data).toEqual({ schemaVersion: 1, label: 'v1' })
  })

  it('변환 단계가 빠져 있으면 오류를 던진다', () => {
    expect(() => migrateToLatest({ schemaVersion: 1 }, { currentVersion: 3, migrations: { 2: (d) => d } })).toThrow(
      /v1 데이터를 변환할 수 없습니다/,
    )
  })

  it('앱보다 새로운 버전은 거부한다', () => {
    expect(() => migrateToLatest({ schemaVersion: 4 }, { currentVersion: 3, migrations })).toThrow(InvalidDataError)
  })

  it.each([
    ['배열', []],
    ['null', null],
    ['문자열', 'x'],
    ['버전 없음', {}],
    ['버전이 문자열', { schemaVersion: '1' }],
    ['버전 0', { schemaVersion: 0 }],
    ['버전이 소수', { schemaVersion: 1.5 }],
  ])('%s는 거부한다', (_name, raw) => {
    expect(() => migrateToLatest(raw)).toThrow(InvalidDataError)
  })
})

describe('isRecord', () => {
  it('배열과 null은 레코드가 아니다', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord('x')).toBe(false)
  })
})

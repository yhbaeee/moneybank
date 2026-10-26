import { CURRENT_SCHEMA_VERSION } from '../domain/types'
import { InvalidDataError } from './errors'

type RawDocument = Record<string, unknown>

/** 키는 "이 버전에서 다음 버전으로" 올리는 함수. 아직 v1뿐이라 비어 있다. */
const MIGRATIONS: Record<number, (data: RawDocument) => RawDocument> = {}

export function isRecord(value: unknown): value is RawDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 저장 문서나 백업을 최신 스키마 버전까지 올린다. 내용 검증은 schema.ts에서 한다. */
export function migrateToLatest(raw: unknown): RawDocument {
  if (!isRecord(raw)) throw new InvalidDataError('데이터 형식이 올바르지 않습니다.')

  const version = raw.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new InvalidDataError('schemaVersion이 올바르지 않습니다.')
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new InvalidDataError('더 새로운 버전의 앱에서 만든 데이터라 읽을 수 없습니다.')
  }

  let data: RawDocument = raw
  for (let from = version; from < CURRENT_SCHEMA_VERSION; from++) {
    const migrate = MIGRATIONS[from]
    if (!migrate) throw new InvalidDataError(`v${from} 데이터를 변환할 수 없습니다.`)
    data = { ...migrate(data), schemaVersion: from + 1 }
  }
  return data
}

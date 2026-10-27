import { CURRENT_SCHEMA_VERSION } from '../domain/types'
import { InvalidDataError } from './errors'

type RawDocument = Record<string, unknown>
type Migration = (data: RawDocument) => RawDocument

/** 키는 "이 버전에서 다음 버전으로" 올리는 함수. 아직 v1뿐이라 비어 있다. */
const MIGRATIONS: Record<number, Migration> = {}

/** 테스트에서 가상의 버전·마이그레이션 체인으로 동작을 확인할 수 있게 주입 가능하게 둔다. */
export interface MigrationOptions {
  currentVersion?: number
  migrations?: Record<number, Migration>
}

export function isRecord(value: unknown): value is RawDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 저장 문서나 백업을 최신 스키마 버전까지 올린다. 내용 검증은 schema.ts에서 한다. */
export function migrateToLatest(
  raw: unknown,
  { currentVersion = CURRENT_SCHEMA_VERSION, migrations = MIGRATIONS }: MigrationOptions = {},
): RawDocument {
  if (!isRecord(raw)) throw new InvalidDataError('데이터 형식이 올바르지 않습니다.')

  const version = raw.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new InvalidDataError('schemaVersion이 올바르지 않습니다.')
  }
  if (version > currentVersion) {
    throw new InvalidDataError('더 새로운 버전의 앱에서 만든 데이터라 읽을 수 없습니다.')
  }

  let data: RawDocument = raw
  for (let from = version; from < currentVersion; from++) {
    const migrate = migrations[from]
    if (!migrate) throw new InvalidDataError(`v${from} 데이터를 변환할 수 없습니다.`)
    data = { ...migrate(data), schemaVersion: from + 1 }
  }
  return data
}

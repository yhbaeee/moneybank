import type { DateString, LedgerData } from '../domain/types'
import { InvalidDataError } from './errors'
import { migrateToLatest } from './migrations'
import { validateLedgerData } from './schema'

/** 백업 파일 = 저장 데이터 + 내보낸 시각 */
export interface BackupFile extends LedgerData {
  exportedAt: string
}

export function createBackup(data: LedgerData, exportedAt: string): BackupFile {
  return { ...data, exportedAt }
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

export function backupFileName(date: DateString): string {
  return `가계부-백업-${date}.json`
}

/**
 * 백업 JSON 문자열을 파싱·마이그레이션·검증한다.
 * @throws InvalidDataError 형식이 올바르지 않을 때(호출자는 기존 데이터를 변경하지 않는다)
 */
export function parseBackup(text: string): LedgerData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (cause) {
    throw new InvalidDataError('JSON 형식이 올바르지 않습니다.', [], { cause })
  }
  return validateLedgerData(migrateToLatest(parsed))
}

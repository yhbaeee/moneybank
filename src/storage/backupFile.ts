import type { LedgerData } from '../domain/types'
import { parseBackup } from './backup'
import { InvalidDataError } from './errors'

/** 백업 파일 크기 상한. 이보다 크면 읽지 않고 거부한다. */
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024
const MAX_SHOWN_PROBLEMS = 5

export type BackupReadResult =
  | { ok: true; data: LedgerData }
  | { ok: false; message: string; details: string[] }

/** 선택한 백업 파일을 읽고 검증한다. 실패하면 사용자에게 보여 줄 메시지와 문제 위치(최대 5개)를 돌려준다. */
export async function readBackupFile(file: File): Promise<BackupReadResult> {
  if (file.size > MAX_BACKUP_BYTES) {
    return { ok: false, message: '파일이 너무 큽니다. (최대 10MB)', details: [] }
  }
  try {
    return { ok: true, data: parseBackup(await file.text()) }
  } catch (error) {
    if (error instanceof InvalidDataError) {
      return { ok: false, message: error.message, details: error.details.slice(0, MAX_SHOWN_PROBLEMS) }
    }
    return { ok: false, message: '파일을 읽지 못했습니다.', details: [] }
  }
}

import { describe, expect, it } from 'vitest'
import { createSeedData } from '../domain/defaults'
import { createBackup, serializeBackup } from './backup'
import { MAX_BACKUP_BYTES, readBackupFile } from './backupFile'

const file = (content: string, name = 'backup.json') => new File([content], name, { type: 'application/json' })

describe('readBackupFile', () => {
  it('올바른 백업 파일은 데이터로 돌려준다', async () => {
    const data = createSeedData()
    const result = await readBackupFile(file(serializeBackup(createBackup(data, '2026-10-27T00:00:00.000Z'))))
    expect(result).toEqual({ ok: true, data })
  })

  it('JSON이 아니면 실패 메시지를 돌려준다', async () => {
    expect(await readBackupFile(file('이건 JSON이 아닙니다'))).toEqual({ ok: false, message: 'JSON 형식이 올바르지 않습니다.', details: [] })
  })

  it('내용 검증에 실패하면 문제 위치를 최대 5개까지 돌려준다', async () => {
    const data = createSeedData()
    const broken = {
      ...data,
      transactions: Array.from({ length: 9 }, (_, i) => ({ id: `t${i}`, type: 'x' })),
    }
    const result = await readBackupFile(file(JSON.stringify(broken)))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe('데이터 검증에 실패했습니다.')
      expect(result.details).toHaveLength(5)
    }
  })

  it('크기 상한(10MB)을 넘는 파일은 읽지 않고 거부한다', async () => {
    const big = file('{}')
    Object.defineProperty(big, 'size', { value: MAX_BACKUP_BYTES + 1 })
    let textCalled = false
    Object.defineProperty(big, 'text', { value: () => ((textCalled = true), Promise.resolve('{}')) })
    expect(await readBackupFile(big)).toEqual({ ok: false, message: '파일이 너무 큽니다. (최대 10MB)', details: [] })
    expect(textCalled).toBe(false)
  })

  it('상한과 같은 크기는 허용한다', async () => {
    const edge = file('{}')
    Object.defineProperty(edge, 'size', { value: MAX_BACKUP_BYTES })
    const result = await readBackupFile(edge)
    expect(result.ok).toBe(false) // 크기는 통과했고 내용(빈 객체)이 거부된다
    if (!result.ok) expect(result.message).not.toContain('너무 큽니다')
  })

  it('파일을 읽지 못하면 일반 실패 메시지를 돌려준다', async () => {
    const unreadable = file('{}')
    Object.defineProperty(unreadable, 'text', { value: () => Promise.reject(new Error('read error')) })
    expect(await readBackupFile(unreadable)).toEqual({ ok: false, message: '파일을 읽지 못했습니다.', details: [] })
  })
})

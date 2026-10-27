import { describe, expect, it } from 'vitest'
import { createSessionRepository } from '.'
import { createMemoryStorage } from './memoryStorage'

describe('createMemoryStorage', () => {
  it('Storage 계약대로 읽기·쓰기·삭제·초기화를 지원한다', () => {
    const storage = createMemoryStorage()
    expect(storage.getItem('a')).toBeNull()
    storage.setItem('a', '1')
    storage.setItem('b', '2')
    expect(storage.getItem('a')).toBe('1')
    expect(storage.length).toBe(2)
    expect(storage.key(0)).toBe('a')
    expect(storage.key(5)).toBeNull()
    storage.removeItem('a')
    expect(storage.getItem('a')).toBeNull()
    storage.clear()
    expect(storage.length).toBe(0)
  })

  it('값을 문자열로 저장한다', () => {
    const storage = createMemoryStorage()
    storage.setItem('n', 5 as unknown as string)
    expect(storage.getItem('n')).toBe('5')
  })

  it('인스턴스끼리 독립적이다', () => {
    const a = createMemoryStorage()
    const b = createMemoryStorage()
    a.setItem('k', 'v')
    expect(b.getItem('k')).toBeNull()
  })
})

describe('createSessionRepository', () => {
  it('실제 localStorage에는 쓰지 않고 상한 없이 동작한다', async () => {
    const repo = createSessionRepository()
    await repo.init()
    await repo.transactions.create({
      type: 'expense', amount: 1000, date: '2026-10-27', categoryId: 'cat-expense-1', paymentMethodId: 'pay-1', memo: '', tags: [],
    })
    expect(localStorage.length).toBe(0)
    expect(await repo.transactions.list()).toHaveLength(1)
    expect((await repo.getUsage()).limitChars).toBe(Number.POSITIVE_INFINITY)
  })
})

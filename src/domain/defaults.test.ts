import { describe, expect, it } from 'vitest'
import { DEFAULT_MEMBER_ID, createSeedData } from './defaults'
import { CURRENT_SCHEMA_VERSION } from './types'

describe('createSeedData', () => {
  const seed = createSeedData()

  it('PRD의 기본 카테고리와 결제수단을 제공한다', () => {
    expect(seed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(seed.categories.filter((c) => c.type === 'expense')).toHaveLength(9)
    expect(seed.categories.filter((c) => c.type === 'income')).toHaveLength(4)
    expect(seed.paymentMethods.map((p) => p.name)).toEqual(['현금', '체크카드', '신용카드', '계좌이체', '기타'])
    expect(seed.members).toEqual([{ id: DEFAULT_MEMBER_ID, name: '나' }])
    expect(seed.transactions).toEqual([])
  })

  it('id가 모두 고유하다', () => {
    const ids = [...seed.categories, ...seed.paymentMethods, ...seed.members].map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("유형별 '기타'만 보호된다", () => {
    const protectedOnes = seed.categories.filter((c) => c.isProtected)
    expect(protectedOnes.map((c) => [c.type, c.name])).toEqual([
      ['expense', '기타'],
      ['income', '기타'],
    ])
  })

  it('호출할 때마다 독립된 객체를 만든다', () => {
    const a = createSeedData()
    a.categories[0].name = '변경'
    expect(createSeedData().categories[0].name).toBe('식비')
  })
})

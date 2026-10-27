import { describe, expect, it } from 'vitest'
import { CATEGORY_COLORS, CATEGORY_COLOR_OPTIONS, DEFAULT_MEMBER_ID, createSeedData, pickCategoryColor } from './defaults'
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

describe('카테고리 색 선택', () => {
  const { categories } = createSeedData()

  it('색 선택지는 팔레트와 같은 순서이고 모두 이름이 있다', () => {
    expect(CATEGORY_COLOR_OPTIONS.map((o) => o.value)).toEqual([...CATEGORY_COLORS])
    expect(CATEGORY_COLOR_OPTIONS.every((o) => o.label.length > 0)).toBe(true)
    expect(new Set(CATEGORY_COLOR_OPTIONS.map((o) => o.label)).size).toBe(CATEGORY_COLOR_OPTIONS.length)
  })

  it('같은 유형에서 쓰지 않은 색을 먼저 고른다', () => {
    // 지출 기본 카테고리 9개가 팔레트 9색을 모두 쓰므로 순환한다.
    expect(pickCategoryColor(categories, 'expense')).toBe(CATEGORY_COLORS[9 % CATEGORY_COLORS.length])
    // 수입은 4색만 쓰므로 다음 색(5번째)을 고른다.
    expect(pickCategoryColor(categories, 'income')).toBe(CATEGORY_COLORS[4])
  })

  it('다른 유형이 쓰는 색은 쓴 것으로 치지 않는다', () => {
    const onlyExpense = categories.filter((c) => c.type === 'expense')
    expect(pickCategoryColor(onlyExpense, 'income')).toBe(CATEGORY_COLORS[0])
  })
})
